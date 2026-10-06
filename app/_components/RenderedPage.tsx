import { PublicSite } from './PublicSite';

/**
 * The public experience intentionally has one renderer.  The former V25
 * capture/runtime pair rendered two competing DOM trees and leaked template
 * bindings into previews.  All supported public pages now render React only.
 */
export function RenderedPage({ pathName }: { pathName: string }) {
  return <PublicSite pathName={pathName} />;
}
