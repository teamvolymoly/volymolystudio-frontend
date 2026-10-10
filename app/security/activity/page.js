import LoginActivityReview from "../../../features/security/components/login-activity-review";

export const metadata = {
  title: "Review sign-in activity | Volymoly",
  description: "Review a recent sign-in and secure your Volymoly account.",
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginActivityPage() {
  return <LoginActivityReview />;
}
