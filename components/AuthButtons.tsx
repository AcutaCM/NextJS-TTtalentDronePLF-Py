"use client";

import React from "react";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserMenu from "./UserMenu";

export default function AuthButtons() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
    );
  }

  if (isAuthenticated) {
    return <UserMenu />;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        as={Link}
        href="/login"
        variant="ghost"
        size="sm"
        className="text-white/80 hover:text-white hover:bg-white/10"
        startContent={<LogIn className="w-4 h-4" />}
      >
        登录
      </Button>
      <Button
        as={Link}
        href="/register"
        size="sm"
        className="bg-blue-600 hover:bg-blue-500 text-white"
        startContent={<UserPlus className="w-4 h-4" />}
      >
        注册
      </Button>
    </div>
  );
}