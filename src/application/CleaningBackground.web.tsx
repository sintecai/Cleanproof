import {useEffect,useState} from 'react';
import {Image} from 'react-native';
const glass=require('../../assets/backgrounds/glass-water.jpg');
/** Compositor-only web animation. This stable root never depends on the route. */
export function CleaningBackground(){
 const [visible,setVisible]=useState(true);
 useEffect(()=>{const update=()=>setVisible(document.visibilityState==='visible');update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 return <div aria-hidden="true" className="cp-clean-background" data-paused={!visible} style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',background:'#edf4ee'}}>
  <style>{`.cp-clean-water{position:absolute;inset:-24px;animation:cp-clean-drift 36s ease-in-out infinite alternate;will-change:transform}.cp-clean-light{position:absolute;inset:0;background:#eafff3;animation:cp-clean-light 36s ease-in-out infinite alternate}.cp-clean-background[data-paused=true]>*{animation-play-state:paused}@keyframes cp-clean-drift{from{transform:scale(1.04) translate(-8px,0)}to{transform:scale(1.04) translate(8px,-12px)}}@keyframes cp-clean-light{from{opacity:.04}to{opacity:.14}}@media(prefers-reduced-motion:reduce){.cp-clean-water,.cp-clean-light{animation:none;will-change:auto}.cp-clean-water{transform:none}.cp-clean-light{opacity:.04}}`}</style>
  <div className="cp-clean-water"><Image source={glass} accessible={false} resizeMode="cover" style={{width:'100%',height:'100%'}}/></div>
  <div style={{position:'absolute',inset:0,background:'rgba(247,248,242,0.67)'}}/>
  <div className="cp-clean-light"/>
 </div>;
}
