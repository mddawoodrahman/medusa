import { SignIn } from "@clerk/nextjs";

const SignInPage = () => (
  <div className="w-full max-w-[420px]">
    <SignIn
      path="/sign-in"
      routing="path"
      signUpUrl="/sign-up"
      forceRedirectUrl="/"
    />
  </div>
);

export default SignInPage;
