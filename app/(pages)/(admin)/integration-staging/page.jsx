import { redirect } from "next/navigation";

/* The standalone staging workspace was retired: the Data Integration and
   Manual Upload pages share the same staging workspace component, and this
   page had drifted into a second, unmaintained copy of the upload, fetch and
   migrate flows. Kept as a redirect so old links still land somewhere. */
export default function IntegrationStagingPage() {
  redirect("/integration");
}
