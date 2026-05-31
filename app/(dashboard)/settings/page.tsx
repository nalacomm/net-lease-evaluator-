import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SignOutButton } from "@/components/sign-out";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const aiConfigured = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" />
      <div className="card space-y-2">
        <h3 className="font-semibold">Account</h3>
        <p className="text-sm text-gray-600">
          Signed in as{" "}
          <span className="font-medium">{session?.user?.email}</span>
        </p>
        <SignOutButton />
      </div>
      <div className="card space-y-1">
        <h3 className="font-semibold">AI Scoring</h3>
        <p className="text-sm text-gray-600">
          Anthropic API key:{" "}
          <span
            className={
              aiConfigured ? "font-medium text-green-700" : "font-medium text-red-600"
            }
          >
            {aiConfigured ? "Configured" : "Not set"}
          </span>
        </p>
        {!aiConfigured && (
          <p className="text-xs text-gray-500">
            Set ANTHROPIC_API_KEY in your environment to enable intake parsing.
            Scoring math runs without it.
          </p>
        )}
      </div>
    </div>
  );
}
