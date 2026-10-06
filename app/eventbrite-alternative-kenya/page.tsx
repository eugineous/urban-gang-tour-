import type { Metadata } from "next";
import { RenderedPage } from "@/app/_components/RenderedPage";
import { metadataForPathDynamic } from "@/app/_lib/seo";

const PATH = "/eventbrite-alternative-kenya";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForPathDynamic(PATH);
}

export default function EventbriteAlternativeKenyaPage() {
  return <RenderedPage pathName={PATH} />;
}
