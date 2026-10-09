import {RenderedPage} from '@/app/_components/RenderedPage';
import {JsonLd} from '@/app/_components/JsonLd';
import {metadataForPathDynamic} from '@/app/_lib/seo';
import {structuredDataForPath} from '@/app/_lib/jsonld';
const PATH='/author/lucy-ogunde';
export const revalidate=300;
export async function generateMetadata(){return metadataForPathDynamic(PATH)}
export default function Page(){return <><JsonLd data={structuredDataForPath(PATH)}/><RenderedPage pathName={PATH}/></>}
