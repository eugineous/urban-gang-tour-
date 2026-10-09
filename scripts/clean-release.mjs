import {rm} from 'node:fs/promises';
// Start with no exported HTML, stale chunks or previous deployment assets.
for(const path of ['.open-next','.next','public-design'])await rm(path,{recursive:true,force:true});
console.log('Cleared obsolete and generated deployment outputs.');
