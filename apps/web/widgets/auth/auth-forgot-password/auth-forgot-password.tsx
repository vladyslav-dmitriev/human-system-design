"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Mail, ArrowRight, Loader2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { ROUTE } from "@/constants";

interface ForgotPasswordInputs {
  email: string;
}

export function AuthForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInputs>();

  const onSubmit = async (data: ForgotPasswordInputs) => {
    setIsLoading(true);
    // Имитация API запроса
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    setIsSubmitted(true);
    toast.success("Инструкции отправлены на ваш email");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-50/50">
      <Card className="w-full max-w-md border border-muted/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="space-y-2 pb-6">
          <div className="flex justify-start">
            <Link
              href={ROUTE.LOGIN}
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center text-xs font-medium"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back to login
            </Link>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {isSubmitted ? "Check your email" : "Reset password"}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground/80 leading-relaxed">
            {isSubmitted
              ? "We have sent password recovery instructions to your email address."
              : "Enter your email address and we'll send you a link to reset your password."}
          </CardDescription>
        </CardHeader>

        {!isSubmitted && (
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 pb-6">
              <div className="space-y-2">
                <div className="relative group">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /\S+@\S+\.\S+/,
                        message: "Invalid email",
                      },
                    })}
                    className="pl-9 h-10 bg-secondary/20 border-muted/60 focus-visible:ring-1 focus-visible:ring-primary/40 rounded-lg"
                    placeholder="name@domain.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-destructive font-medium pl-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-10 rounded-lg font-medium bg-foreground text-background hover:bg-foreground/90 transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Send instructions <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </Button>
            </CardContent>
          </form>
        )}
      </Card>
    </div>
  );
}
