"use client";

import { FC } from "react";
import { VisuallyHidden } from "@react-aria/visually-hidden";
import { SwitchProps, useSwitch } from "@heroui/switch";
import { useTheme } from "next-themes";
import { useIsSSR } from "@react-aria/ssr";
import clsx from "clsx";

import { SunFilledIcon, MoonFilledIcon } from "./icons";

export interface ThemeSwitchProps {
  className?: string;
  classNames?: SwitchProps["classNames"];
}

export const ThemeSwitch: FC<ThemeSwitchProps> = ({
  className,
  classNames,
}) => {
  const { theme, setTheme } = useTheme();
  const isSSR = useIsSSR();

  const onChange = () => {
    theme === "light" ? setTheme("dark") : setTheme("light");
  };

  const {
    Component,
    slots,
    isSelected,
    getBaseProps,
    getInputProps,
    getWrapperProps,
  } = useSwitch({
    isSelected: theme === "light" || isSSR,
    "aria-label": `Switch to ${theme === "light" || isSSR ? "dark" : "light"} mode`,
    onChange,
  });

  return (
    <Component
      {...getBaseProps({
        className: clsx(
          "px-px transition-opacity hover:opacity-80 cursor-pointer",
          className,
          classNames?.base
        ),
      })}
    >
      <VisuallyHidden>
        <input {...getInputProps()} />
      </VisuallyHidden>
      <div
        {...getWrapperProps()}
        className={slots.wrapper({
          class: clsx(
            [
              "w-auto h-auto",
              "bg-transparent",
              "rounded-lg",
              "flex items-center justify-center",
              "group-data-[selected=true]:bg-transparent",
              "!text-default-500",
              "pt-px",
              "px-0",
              "mx-0",
            ],
            classNames?.wrapper
          ),
        })}
      >
        {!isSelected || isSSR ? (
          <SunFilledIcon size={22} />
        ) : (
          <MoonFilledIcon size={22} />
        )}
      </div>
    </Component>
  );
};

// 高级主题切换器，支持多个主题
export const AdvancedThemeSwitch: FC<ThemeSwitchProps> = ({
  className,
}) => {
  const { theme, setTheme } = useTheme();
  const isSSR = useIsSSR();

  const themes = [
    { key: "light", name: "明亮", icon: "☀️" },
    { key: "dark", name: "暗黑", icon: "🌙" },
    { key: "drone-theme", name: "无人机", icon: "🚁" },
  ];

  const currentThemeIndex = themes.findIndex(t => t.key === theme);
  const nextTheme = themes[(currentThemeIndex + 1) % themes.length];

  const handleThemeChange = () => {
    setTheme(nextTheme.key);
  };

  if (isSSR) {
    return null;
  }

  return (
    <button
      className={clsx(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-default-100 hover:bg-default-200",
        "transition-all duration-200",
        "text-sm font-medium",
        className
      )}
      onClick={handleThemeChange}
    >
      <span className="text-lg">{nextTheme.icon}</span>
      <span>切换到{nextTheme.name}</span>
    </button>
  );
};
