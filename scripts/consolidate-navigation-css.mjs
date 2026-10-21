/** One-time mechanical migration: retain non-navigation branches of mixed rules.
 * Run with --write to apply; default reports only. No page/body rules are removed.
 */
import fs from 'node:fs';
import postcss from 'postcss';
const files=['globals','design','modern','refinements','mobile-experience','reconstruction','android-mobile','concise-media','interaction-foundations','international','responsive-continuation'];
const navigation=/\.(?:site-header|desktop-nav|header-actions|start-link|menu-toggle|mobile-about-link|mobile-shop-link|cart-link|brand|burger|menu-panel|menu-groups|menu-link-copy|menu-bottom|menu-account-links|menu-dialog-heading|menu-kicker|focus-control|on-hero|is-scrolled)(?![\w-])/;
for(const name of files){
 const path=`app/${name}.css`,root=postcss.parse(fs.readFileSync(path,'utf8'));let removed=0;
 root.walkRules(rule=>{const selectors=postcss.list.comma(rule.selector),keep=selectors.filter(selector=>!navigation.test(selector));removed+=selectors.length-keep.length;if(!keep.length)rule.remove();else if(keep.length!==selectors.length)rule.selector=keep.join(',');});
 root.walkAtRules(rule=>{if(rule.nodes&&!rule.nodes.length)rule.remove();});
 if(process.argv.includes('--write'))fs.writeFileSync(path,root.toString());
 console.log(`${path}: ${removed} obsolete navigation selector branches removed`);
}
