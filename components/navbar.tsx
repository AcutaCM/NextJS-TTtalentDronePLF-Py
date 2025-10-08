import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem,
} from "@heroui/navbar";
import { Button } from "@heroui/button";
import { Kbd } from "@heroui/kbd";
import { Link } from "@heroui/link";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Avatar } from "@heroui/avatar";
import { Badge } from "@heroui/badge";
import { link as linkStyles } from "@heroui/theme";
import NextLink from "next/link";
import clsx from "clsx";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import {
  TwitterIcon,
  GithubIcon,
  DiscordIcon,
  HeartFilledIcon,
  SearchIcon,
  Logo,
} from "@/components/icons";

export const Navbar = () => {
  const searchInput = (
    <Input
      aria-label="搜索"
      classNames={{
        inputWrapper: "bg-default-100/60 backdrop-blur-sm border border-white/10",
        input: "text-sm",
      }}
      endContent={
        <Kbd className="hidden lg:inline-block" keys={["command"]}>
          K
        </Kbd>
      }
      labelPlacement="outside"
      placeholder="搜索功能、设备、日志..."
      startContent={
        <SearchIcon className="text-base text-default-400 pointer-events-none flex-shrink-0" />
      }
      type="search"
      size="sm"
    />
  );

  const filterChips = (
    <div className="hidden md:flex items-center gap-2">
      <Chip color="primary" variant="solid" radius="sm">全部</Chip>
      <Chip variant="flat" radius="sm">实时流</Chip>
      <Chip variant="flat" radius="sm">任务板</Chip>
      <Chip variant="flat" radius="sm">AI分析</Chip>
      <Chip variant="flat" radius="sm">日志</Chip>
      <Chip variant="flat" radius="sm">地图</Chip>
    </div>
  );

  return (
    <HeroUINavbar maxWidth="full" position="sticky" className="backdrop-blur-md bg-[#0b1222]/70 border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
      <NavbarContent className="basis-1/3 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <NextLink className="flex justify-start items-center gap-2" href="/">
            <Logo />
            <div className="leading-tight">
              <p className="font-bold text-inherit">TTitanDrone无人机病害诊断平台</p>
              <p className="text-tiny text-default-500">DRONE FLY</p>
            </div>
          </NextLink>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden xl:flex basis-1/3" justify="center">
        {filterChips}
      </NavbarContent>

      <NavbarContent className="basis-1/3 sm:basis-full" justify="end">
        <NavbarItem className="hidden lg:flex w-[320px]">{searchInput}</NavbarItem>
        <NavbarItem className="hidden sm:flex items-center gap-3">
          <ThemeSwitch />
           <Button isIconOnly variant="light" size="sm" aria-label="设置">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-default-500">
               <path d="M19.14,12.94a7,7,0,0,0,.05-.94,7,7,0,0,0-.05-.94l2.11-1.65a.5.5,0,0,0,.12-.64l-2-3.46a.5.5,0,0,0-.6-.22l-2.49,1a7,7,0,0,0-1.63-.94l-.38-2.65A.5.5,0,0,0,13.64,2H10.36a.5.5,0,0,0-.5.43L9.48,5.08a7,7,0,0,0-1.63.94l-2.49-1a.5.5,0,0,0-.6.22l-2,3.46a.5.5,0,0,0,.12.64L5.11,11.06a7,7,0,0,0,0,1.88L2.88,14.59a.5.5,0,0,0-.12.64l2,3.46a.5.5,0,0,0,.6.22l2.49-1a7,7,0,0,0,1.63.94l.38,2.65a.5.5,0,0,0,.5.43h3.28a.5.5,0,0,0,.5-.43l.38-2.65a7,7,0,0,0,1.63-.94l2.49,1a.5.5,0,0,0,.6-.22l2-3.46a.5.5,0,0,0-.12-.64ZM12,15.5A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
             </svg>
           </Button>
          <Badge color="danger" content="3" size="sm" className="min-w-[18px] h-[18px]">
            <Button isIconOnly variant="light" size="sm" aria-label="通知">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-default-500">
                <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V11a6 6 0 0 0-12 0v5l-2 2v1h18v-1l-2-2Z" />
              </svg>
            </Button>
          </Badge>
          <Chip size="sm" color="success" variant="flat">已登录</Chip>
           <Avatar size="sm" isBordered color="primary" src="" name="TT" className="bg-primary-500 text-white" />
        </NavbarItem>
        <NavbarItem className="lg:hidden">{searchInput}</NavbarItem>
        <NavbarMenuToggle className="sm:hidden" />
      </NavbarContent>

      <NavbarMenu>
        <div className="px-4 py-3 flex flex-col gap-4">
          {filterChips}
          {searchInput}
          <div className="flex items-center gap-3">
            <ThemeSwitch />
            <Button isIconOnly variant="light" size="sm" aria-label="通知">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-default-500">
                <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V11a6 6 0 0 0-12 0v5l-2 2v1h18v-1l-2-2Z" />
              </svg>
            </Button>
            <Avatar size="sm" isBordered color="primary" src="" name="TT" className="bg-primary-500 text-white" />
          </div>
        </div>
      </NavbarMenu>
    </HeroUINavbar>
  );
};
