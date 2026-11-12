import {useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,AppState,Image,Platform,StyleSheet,View} from 'react-native';
const glass=require('../../assets/backgrounds/glass-water.jpg');
/** One full-page decorative layer above the canvas and below all content.
 * Owned by LayoutFrame, not by routes: navigation cannot restart the image or motion.
 * No evidence, remote requests, layout measurement or interaction belongs here.
 */
export function CleaningBackground(){
 const drift=useRef(new Animated.Value(0)).current;
 const [reduce,setReduce]=useState(true),[active,setActive]=useState(true);
 useEffect(()=>{let alive=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(alive)setReduce(value);}).catch(()=>{});const motion=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduce);const state=AppState.addEventListener('change',s=>setActive(s==='active'));
  const visibility=()=>setActive(document.visibilityState==='visible');
  if(Platform.OS==='web'){visibility();document.addEventListener('visibilitychange',visibility);}
  return()=>{alive=false;motion.remove();state.remove();if(Platform.OS==='web')document.removeEventListener('visibilitychange',visibility);};
 },[]);
 useEffect(()=>{if(reduce||!active){drift.stopAnimation();if(reduce)drift.setValue(0);return;}const loop=Animated.loop(Animated.sequence([Animated.timing(drift,{toValue:1,duration:18000,useNativeDriver:true,isInteraction:false}),Animated.timing(drift,{toValue:0,duration:18000,useNativeDriver:true,isInteraction:false})]));loop.start();return()=>loop.stop();},[active,reduce,drift]);
 return <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill,{overflow:'hidden',backgroundColor:'#edf4ee'}]}>
  <Animated.View style={[StyleSheet.absoluteFill,{inset:-20,transform:[{scale:1.04},{translateX:drift.interpolate({inputRange:[0,1],outputRange:[-8,8]})},{translateY:drift.interpolate({inputRange:[0,1],outputRange:[0,-12]})}]}]}><Image source={glass} resizeMode="cover" style={{width:'100%',height:'100%'}} fadeDuration={0}/></Animated.View>
  <View style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(247,248,242,0.67)'}]}/>
  <Animated.View style={[StyleSheet.absoluteFill,{backgroundColor:'#eafff3',opacity:drift.interpolate({inputRange:[0,1],outputRange:[0.04,0.14]})}]}/>
 </View>;
}
