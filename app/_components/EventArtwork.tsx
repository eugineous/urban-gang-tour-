import styles from './PartnerEvents.module.css';
export function EventArtwork({name,image,label='Event announcement'}:{name:string;image?:string;label?:string}){
 return image?<img src={image} alt={name+' event artwork'}/>:<div className={styles.placeholder} role="img" aria-label={label+' for '+name+'. Artwork has not been added.'}><span>{label}</span><strong>{name}</strong><small>Urban Gang Tour · Events</small></div>;
}
