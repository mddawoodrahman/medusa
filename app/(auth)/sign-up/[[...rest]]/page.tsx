import { SignUp } from "@clerk/nextjs";

const SignUpPage = () => (
  <div className="w-full max-w-[420px]">
    <SignUp
      path="/sign-up"
      routing="path"
      signInUrl="/sign-in"
      forceRedirectUrl="/"
    />
  </div>
);

export default SignUpPage;
