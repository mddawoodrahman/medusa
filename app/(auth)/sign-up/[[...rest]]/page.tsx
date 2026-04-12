import { SignUp } from "@clerk/nextjs";

const SignUpPage = () => (
  <div className="w-full rounded-[28px] border border-light-200/60 bg-white p-5 shadow-drop-3 dark:border-light-300/20 dark:bg-dark-200 sm:p-8">
    <div className="mb-6 space-y-2">
      <p className="caption uppercase tracking-[0.2em] text-light-200">Create account</p>
      <h1 className="h3 text-light-100 dark:text-light-100">Join Medusa</h1>
      <p className="body-2 text-light-100/80 dark:text-light-200">
        Set up your workspace and start organizing files in minutes.
      </p>
    </div>

    <SignUp
      path="/sign-up"
      routing="path"
      signInUrl="/sign-in"
      forceRedirectUrl="/"
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "w-full border-none shadow-none bg-transparent p-0",
          headerTitle: "hidden",
          headerSubtitle: "hidden",
          socialButtonsBlockButton:
            "h-11 rounded-xl border border-light-200/70 bg-white text-light-100 hover:bg-light-300/50 dark:border-light-300/30 dark:bg-dark-100 dark:text-light-100",
          socialButtonsBlockButtonText: "subtitle-2",
          dividerLine: "bg-light-200/70 dark:bg-light-300/20",
          dividerText: "caption text-light-200",
          formFieldLabel: "body-2 mb-2 text-light-100 dark:text-light-200",
          formFieldInput:
            "h-11 rounded-xl border border-light-200/70 bg-white text-light-100 shadow-none focus:border-brand focus:ring-2 focus:ring-brand/15 dark:border-light-300/30 dark:bg-dark-100 dark:text-light-100",
          formButtonPrimary:
            "mt-2 h-11 rounded-xl bg-brand text-white transition-colors hover:bg-brand-100",
          footerActionText: "body-2 text-light-200",
          footerActionLink: "body-2 font-semibold text-brand hover:text-brand-100",
          formFieldInputShowPasswordButton:
            "text-light-200 hover:text-light-100 dark:hover:text-light-100",
          identityPreviewText: "body-2 text-light-100 dark:text-light-100",
          identityPreviewEditButton: "body-2 font-semibold text-brand hover:text-brand-100",
        },
      }}
    />
  </div>
);

export default SignUpPage;
