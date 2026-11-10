'use client';
import {useEffect} from 'react';
import {installOverlayOrigins} from '@/lib/client/overlay-origin';
/** No wrapper, requests, storage, delays or financial state. */
export default function InteractionCraft(){useEffect(()=>installOverlayOrigins(document),[]);return null}
