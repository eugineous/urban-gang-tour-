import {NextResponse} from 'next/server';
import {editorToolsOpenApi} from '@/lib/editor-tools-openapi';
// Public read-only schema. No authentication, secrets, accounts or data.
export async function GET(){return NextResponse.json(editorToolsOpenApi,{headers:{'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}})}
