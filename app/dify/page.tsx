"use client";

import React from "react";

const DIFY_URL = "/api/proxy/dify/";

export default function DifyPage() {
  return (
    <div style={{position: "fixed", inset: 0, paddingTop: 64}}>
      <iframe
        src={DIFY_URL}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          background: "transparent",
        }}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
      />
    </div>
  );
}