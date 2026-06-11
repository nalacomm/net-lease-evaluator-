import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { TenantOnboarding } from "@/components/tenant-onboarding";
import { ArrowLeft } from "lucide-react";

export default function NewTenantPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Add Tenant"
        subtitle="Enter requirements manually or describe what they need and let AI build it"
        action={
          <Link href="/tenants" className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />
      <TenantOnboarding />
    </div>
  );
}
