import type { Metadata } from "next";
import { metadataForPathDynamic } from "@/app/_lib/seo";
import { structuredDataForPath } from "@/app/_lib/jsonld";
import { PEOPLE } from "@/app/_lib/jsonld";
import { JsonLd } from "@/app/_components/JsonLd";
import { RenderedPage } from "@/app/_components/RenderedPage";

const PATH = "/the-gang";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}

export default function Page() {
  const structured = structuredDataForPath(PATH);
  return (
    <>
      <JsonLd data={[PEOPLE, ...structured]} />
      <RenderedPage pathName={PATH} />
    </>
  );
}
