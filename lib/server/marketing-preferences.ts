import {q} from './db';
import {ensureEngagementSchema,EVENT_INTERESTS} from './engagement';
export type EventInterest=typeof EVENT_INTERESTS[number];
// Existing newsletter subscriptions are explicit consent. A saved account opt-out
// overrides that row; accounts without either consent source never receive marketing.
export const MARKETING_RECIPIENTS_SQL=`SELECT DISTINCT s.email FROM subscribers s LEFT JOIN users u ON lower(u.email)=lower(s.email) LEFT JOIN notification_preferences p ON p.user_id=u.id WHERE COALESCE(p.marketing_email,true)=true AND ($1::text IS NULL OR p.user_id IS NULL OR jsonb_array_length(p.event_interests)=0 OR p.event_interests ? $1) UNION SELECT u.email FROM users u JOIN notification_preferences p ON p.user_id=u.id WHERE p.marketing_email=true AND u.email IS NOT NULL AND ($1::text IS NULL OR jsonb_array_length(p.event_interests)=0 OR p.event_interests ? $1)`;
export async function marketingRecipients(interest:EventInterest|null=null){await ensureEngagementSchema();return q<{email:string}>(MARKETING_RECIPIENTS_SQL,[interest])}
