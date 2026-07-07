import { redirect } from "next/navigation";

export const metadata = {
  title: "Enter demo",
};

// No account creation in the public demo — funnel everything to the single
// demo-access entry point.
export default function SignUpPage() {
  redirect("/sign-in");
}
