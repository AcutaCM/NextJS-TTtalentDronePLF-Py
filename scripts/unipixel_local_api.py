import os
import io
import base64
import tempfile
from typing import Optional

import torch
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from transformers import AutoProcessor, AutoModelForCausalLM
from gradio_client import Client
import uvicorn

# 官方 UniPixel 本地推理依赖
import imageio.v3 as iio
import nncore

from unipixel.dataset.utils import process_vision_info
from unipixel.model.builder import build_model
from unipixel.utils.io import load_image, load_video
from unipixel.utils.transforms import get_sam2_transform
from unipixel.utils.visualizer import draw_mask


"""
UniPixel 本地综合服务
- /describe_image：使用本地 UniPixel-3B 文本描述（保留原加载）
- /infer_seg：Gradio Space /partial（multipart）
- /infer_seg_base64：Gradio Space /partial（JSON，推荐）
- /infer_unipixel：官方管线本地分割（multipart）
- /infer_unipixel_base64：官方管线本地分割（JSON，推荐）

环境变量：
- MODEL_PATH：本地 UniPixel-3B 文本描述模型路径（默认：~/models/UniPixel-3B）
- HF_SPACE：Gradio Space 名称（默认：PolyU-ChenLab/UniPixel）
- HF_TOKEN：Space 为私有时需要

运行示例（WSL）：
  pip install fastapi uvicorn transformers pillow gradio_client imageio nncore unipixel
  uvicorn unipixel_local_api:app --host 0.0.0.0 --port 8000
"""

# 配置
MODEL_PATH = os.path.expanduser(os.environ.get("MODEL_PATH", "~/models/UniPixel-3B"))
HF_SPACE: str = os.environ.get("HF_SPACE", "PolyU-ChenLab/UniPixel")
HF_TOKEN: Optional[str] = os.environ.get("HF_TOKEN")

# FastAPI
app = FastAPI(title="UniPixel-3B Local API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局状态：文本描述模型
model: Optional[AutoModelForCausalLM] = None
processor: Optional[AutoProcessor] = None
device = "cuda" if torch.cuda.is_available() else "cpu"

# Gradio Client（云端分割）
client: Optional[Client] = None

# 官方 UniPixel 本地分割模型
uni_model = None
uni_processor = None
sam2_transform = None


@app.on_event("startup")
def startup():
    global model, processor, client, uni_model, uni_processor, sam2_transform
    # 文本描述模型加载（保留）
    try:
        print(f"[UniPixel] Loading local text model from: {MODEL_PATH}")
        print(f"[UniPixel] Using device: {device}")
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_PATH,
            torch_dtype=torch.bfloat16,
            low_cpu_mem_usage=True,
            trust_remote_code=True,
            load_in_4bit=True,
            device_map="auto",
        )
        processor = AutoProcessor.from_pretrained(MODEL_PATH, trust_remote_code=True)
        print("[UniPixel] Local text model and processor loaded.")
    except Exception as e:
        print(f"[UniPixel] Error loading local text model: {e}")
        model = None
        processor = None

    # Gradio Client（云端分割）
    try:
        client = Client(HF_SPACE, hf_token=HF_TOKEN) if HF_TOKEN else Client(HF_SPACE)
        print(f"[UniPixel] Connected to Gradio Space: {HF_SPACE} (token={'set' if HF_TOKEN else 'none'})")
    except Exception as e:
        client = None
        print(f"[UniPixel] Failed to init Gradio Client: {e}")

    # 官方 UniPixel 本地分割模型
    try:
        print("[UniPixel] Building official UniPixel-3B segmentation model...")
        uni_model, uni_processor = build_model('PolyU-ChenLab/UniPixel-3B')
        sam2_transform = get_sam2_transform(uni_model.config.sam2_image_size)
        print("[UniPixel] Official UniPixel-3B segmentation model ready.")
    except Exception as e:
        uni_model = None
        uni_processor = None
        sam2_transform = None
        print(f"[UniPixel] Failed to build official UniPixel model: {e}")


@app.get("/")
def root():
    return {
        "message": "UniPixel Local API running",
        "text_model_loaded": bool(model and processor),
        "gradio_seg_available": client is not None,
        "uni_seg_available": uni_model is not None and uni_processor is not None and sam2_transform is not None,
    }


# 本地文本描述端点
@app.post("/describe_image/")
async def describe_image(file: UploadFile = File(...)):
    if not model or not processor:
        return {"error": "Model is not loaded yet. Please wait or check server logs."}
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        prompt = (
            "A chat between a curious user and an artificial intelligence assistant. "
            "The user provides an image and asks questions about it. "
            "The assistant gives a detailed and long description of the image.\n"
            "USER: <image>\n"
            "Please describe this image in detail.\n"
            "ASSISTANT:"
        )

        inputs = processor(text=prompt, images=image, return_tensors="pt").to(device, torch.bfloat16)

        generated_ids = model.generate(
            **inputs,
            pixel_values=inputs["pixel_values"],
            max_new_tokens=1024,
            do_sample=False,
            num_beams=3,
            use_cache=True,
        )

        generated_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        assistant_response = generated_text.split("ASSISTANT:")[-1].strip()

        return {"description": assistant_response}
    except Exception as e:
        return {"error": str(e)}


# 云端 Gradio 分割（multipart）
@app.post("/infer_seg/")
async def infer_seg(
    file: UploadFile = File(...),
    query: str = Form(...),
    sample_frames: int = Form(16),
):
    if client is None:
        return {"error": "Gradio Client not initialized. Check HF_SPACE/HF_TOKEN and server logs."}

    suffix = os.path.splitext(file.filename or "image.png")[1] or ".png"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp_path = tmp.name
    try:
        content = await file.read()
        tmp.write(content)
    finally:
        try:
            tmp.close()
        except:
            pass

    try:
        res = client.predict("/partial", media=tmp_path, query=query, sample_frames=sample_frames)
        data = getattr(res, "data", None) or res

        description = ""
        mask_base64 = ""

        if isinstance(data, (list, tuple)) and len(data) >= 2:
            desc = data[0]
            description = desc if isinstance(desc, str) else (getattr(desc, "text", "") or getattr(desc, "content", "") or str(desc))
            m = data[1]
            if isinstance(m, str):
                mask_base64 = m
            else:
                mask_base64 = getattr(m, "image", "") or getattr(m, "base64", "") or getattr(m, "data", "")
                path = getattr(m, "path", None)
                if not mask_base64 and isinstance(path, str) and os.path.exists(path):
                    try:
                        with open(path, "rb") as f:
                            mask_base64 = base64.b64encode(f.read()).decode("utf-8")
                    except:
                        pass

        return {"mask": mask_base64, "description": description}
    except Exception as e:
        return {"error": f"gradio_client error: {e}"}
    finally:
        try:
            os.remove(tmp_path)
        except:
            pass


# 云端 Gradio 分割（JSON，推荐）
from pydantic import BaseModel

class SegJsonPayload(BaseModel):
    imageBase64: str
    query: str
    sample_frames: int = 16

@app.post("/infer_seg_base64/")
async def infer_seg_base64(payload: SegJsonPayload):
    if client is None:
        return {"error": "Gradio Client not initialized. Check HF_SPACE/HF_TOKEN and server logs."}

    base64_str = payload.imageBase64.split(",")[-1] if payload.imageBase64.startswith("data:") else payload.imageBase64
    if not base64_str:
        return {"error": "invalid base64"}

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
    tmp_path = tmp.name
    try:
        img_bytes = base64.b64decode(base64_str)
        tmp.write(img_bytes)
    finally:
        try:
            tmp.close()
        except:
            pass

    try:
        res = client.predict("/partial", media=tmp_path, query=payload.query, sample_frames=payload.sample_frames)
        data = getattr(res, "data", None) or res

        description = ""
        mask_base64 = ""

        if isinstance(data, (list, tuple)) and len(data) >= 2:
            desc = data[0]
            description = desc if isinstance(desc, str) else (getattr(desc, "text", "") or getattr(desc, "content", "") or str(desc))
            m = data[1]
            if isinstance(m, str):
                mask_base64 = m
            else:
                mask_base64 = getattr(m, "image", "") or getattr(m, "base64", "") or getattr(m, "data", "")
                path = getattr(m, "path", None)
                if not mask_base64 and isinstance(path, str) and os.path.exists(path):
                    try:
                        with open(path, "rb") as f:
                            mask_base64 = base64.b64encode(f.read()).decode("utf-8")
                    except:
                        pass

        return {"mask": mask_base64, "description": description}
    except Exception as e:
        return {"error": f"gradio_client error: {e}"}
    finally:
        try:
            os.remove(tmp_path)
        except:
            pass


# 官方 UniPixel 本地分割（multipart）
@app.post("/infer_unipixel/")
async def infer_unipixel(file: UploadFile = File(...), query: str = Form(...)):
    if not (uni_model and uni_processor and sam2_transform):
        return {"error": "UniPixel official segmentation model not initialized."}

    suffix = os.path.splitext(file.filename or "media.png")[1] or ".png"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    media_path = tmp.name
    try:
        content = await file.read()
        tmp.write(content)
    finally:
        try:
            tmp.close()
        except:
            pass

    try:
        is_image = any(media_path.lower().endswith(k) for k in (".jpg", ".jpeg", ".png"))
        if is_image:
            frames, images = load_image(media_path), [media_path]
        else:
            frames, images = load_video(media_path, sample_frames=16)

        messages = [{
            'role': 'user',
            'content': [{
                'type': 'video',
                'video': images,
                'min_pixels': 128 * 28 * 28,
                'max_pixels': 256 * 28 * 28 * int(16 / len(images))
            }, {
                'type': 'text',
                'text': query
            }]
        }]

        text = uni_processor.apply_chat_template(messages, add_generation_prompt=True)
        images_data, videos_data, kwargs = process_vision_info(messages, return_video_kwargs=True)

        data = uni_processor(text=[text], images=images_data, videos=videos_data, return_tensors='pt', **kwargs)
        data['frames'] = [sam2_transform(frames).to(uni_model.sam2.dtype)]
        data['frame_size'] = [frames.shape[1:3]]

        dev = next(uni_model.parameters()).device
        output_ids = uni_model.generate(
            **data.to(dev),
            do_sample=False,
            temperature=None,
            top_k=None,
            top_p=None,
            repetition_penalty=None,
            max_new_tokens=512
        )

        assert data.input_ids.size(0) == output_ids.size(0) == 1
        output_ids = output_ids[0, data.input_ids.size(1):]
        if output_ids[-1] == uni_processor.tokenizer.eos_token_id:
            output_ids = output_ids[:-1]

        response = uni_processor.decode(output_ids, clean_up_tokenization_spaces=False)

        imgs = draw_mask(frames, uni_model.seg) if len(uni_model.seg) >= 1 else []
        mask_b64 = ""
        if len(imgs) > 0:
            ext = "gif" if len(imgs) > 1 else "png"
            out_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}")
            out_path = out_tmp.name
            try:
                out_tmp.close()
            except:
                pass

            try:
                if ext == "gif":
                    iio.imwrite(out_path, imgs, duration=100, loop=0)
                else:
                    iio.imwrite(out_path, imgs[0])
                with open(out_path, "rb") as f:
                    mask_b64 = base64.b64encode(f.read()).decode("utf-8")
            finally:
                try:
                    os.remove(out_path)
                except:
                    pass

        return {"mask": mask_b64, "description": response}
    except Exception as e:
        return {"error": f"unipixel infer error: {e}"}
    finally:
        try:
            os.remove(media_path)
        except:
            pass


# 官方 UniPixel 本地分割（JSON，推荐）
class UniSegJsonPayload(BaseModel):
    imageBase64: str
    query: str

@app.post("/infer_unipixel_base64/")
async def infer_unipixel_base64(payload: UniSegJsonPayload):
    if not (uni_model and uni_processor and sam2_transform):
        return {"error": "UniPixel official segmentation model not initialized."}

    base64_str = payload.imageBase64.split(",")[-1] if payload.imageBase64.startswith("data:") else payload.imageBase64
    if not base64_str:
        return {"error": "invalid base64"}

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
    media_path = tmp.name
    try:
        img_bytes = base64.b64decode(base64_str)
        tmp.write(img_bytes)
    finally:
        try:
            tmp.close()
        except:
            pass

    try:
        frames, images = load_image(media_path), [media_path]

        messages = [{
            'role': 'user',
            'content': [{
                'type': 'video',
                'video': images,
                'min_pixels': 128 * 28 * 28,
                'max_pixels': 256 * 28 * 28 * int(16 / len(images))
            }, {
                'type': 'text',
                'text': payload.query
            }]
        }]

        text = uni_processor.apply_chat_template(messages, add_generation_prompt=True)
        images_data, videos_data, kwargs = process_vision_info(messages, return_video_kwargs=True)

        data = uni_processor(text=[text], images=images_data, videos=videos_data, return_tensors='pt', **kwargs)
        data['frames'] = [sam2_transform(frames).to(uni_model.sam2.dtype)]
        data['frame_size'] = [frames.shape[1:3]]

        dev = next(uni_model.parameters()).device
        output_ids = uni_model.generate(
            **data.to(dev),
            do_sample=False,
            temperature=None,
            top_k=None,
            top_p=None,
            repetition_penalty=None,
            max_new_tokens=512
        )

        assert data.input_ids.size(0) == output_ids.size(0) == 1
        output_ids = output_ids[0, data.input_ids.size(1):]
        if output_ids[-1] == uni_processor.tokenizer.eos_token_id:
            output_ids = output_ids[:-1]

        response = uni_processor.decode(output_ids, clean_up_tokenization_spaces=False)

        imgs = draw_mask(frames, uni_model.seg) if len(uni_model.seg) >= 1 else []
        mask_b64 = ""
        if len(imgs) > 0:
            out_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
            out_path = out_tmp.name
            try:
                out_tmp.close()
            except:
                pass

            try:
                iio.imwrite(out_path, imgs[0])
                with open(out_path, "rb") as f:
                    mask_b64 = base64.b64encode(f.read()).decode("utf-8")
            finally:
                try:
                    os.remove(out_path)
                except:
                    pass

        return {"mask": mask_b64, "description": response}
    except Exception as e:
        return {"error": f"unipixel infer error: {e}"}
    finally:
        try:
            os.remove(media_path)
        except:
            pass


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)