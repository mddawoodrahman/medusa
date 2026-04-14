export const clerkAuthAppearance = {
  variables: {
    colorPrimary: "#9F2B68",
    colorText: "#0f172a",
    colorInputText: "#0f172a",
    colorTextSecondary: "#64748b",
    colorBackground: "transparent",
    colorInputBackground: "#ffffff",
    colorInputBorder: "#dbe4f0",
    borderRadius: "1rem",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full border-none bg-transparent p-0 shadow-none",
    card: "w-full border-none bg-transparent p-0 shadow-none",
    main: "gap-5",
    headerTitle: "hidden",
    headerSubtitle: "hidden",

    socialButtonsBlockButton:
      "h-11 rounded-xl border border-slate-200 bg-white text-slate-900 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-dark-100 dark:text-white dark:hover:bg-dark-200",
    socialButtonsBlockButtonText: "text-sm font-medium",

    dividerLine: "bg-slate-200 dark:bg-white/10",
    dividerText: "text-xs uppercase tracking-[0.2em] text-slate-400",

    formFieldLabel: "mb-2 text-sm font-medium text-slate-700 dark:text-slate-200",
    formFieldInput:
      "h-11 rounded-xl border border-slate-200 bg-white text-slate-900 shadow-none transition-colors placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/15 dark:border-white/10 dark:bg-dark-100 dark:text-white",
    formButtonPrimary:
      "mt-2 h-11 rounded-xl bg-brand text-white transition-colors hover:bg-brand-100",
    footer:
      "mt-4 rounded-b-2xl border-t border-slate-200/80 bg-transparent pt-4 dark:border-white/10 [&>div:last-child]:hidden",
    footerAction: "!bg-transparent pb-1",
    footerAction__signIn: "!bg-transparent pb-1",
    footerAction__signUp: "!bg-transparent pb-1",
    footerActionText: "text-sm text-slate-500 dark:text-light-200",
    footerActionLink: "text-sm font-semibold text-brand hover:text-brand-100",

    formFieldInputShowPasswordButton:
      "text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-white",
    identityPreviewText: "text-sm text-slate-700 dark:text-white",
    identityPreviewEditButton:
      "text-sm font-semibold text-brand transition-colors hover:text-brand-100",
    formResendCodeLink: "text-sm font-semibold text-brand hover:text-brand-100",
    alertClerkError: "rounded-xl border border-red-200 bg-red-50 text-red-700",
    formFieldErrorText: "text-xs text-red-500",
  },
} as const;