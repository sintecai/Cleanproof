import {createContext, useContext, useState, type ReactNode} from 'react';
import {Platform, View, useWindowDimensions} from 'react-native';
import {CleaningBackground} from './CleaningBackground';
import {layoutWidth} from './layoutWidth';
const Width = createContext<number | null>(null);
/** One measured container survives route changes; page mounts never guess host width. */
export function LayoutFrame({children}:{children:ReactNode}) {
  const {width} = useWindowDimensions();
  const [measured,setMeasured] = useState<number | null>(null);
  const [desktopPreview] = useState(()=>Platform.OS==='web'&&typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('view')==='desktop');
  const phone = !desktopPreview && Platform.OS === 'web' && process.env.EXPO_PUBLIC_CLEANPROOF_PHONE_PREVIEW === '1';
  return <View onLayout={e=>setMeasured(e.nativeEvent.layout.width)} style={{flex:1,width:'100%',maxWidth:phone?430:undefined,alignSelf:'center',backgroundColor:'#f7f8f5'}}>
    <CleaningBackground/>
    <Width.Provider value={layoutWidth(width,measured,phone)}>{children}</Width.Provider>
  </View>;
}
export function useLayoutWidth() {
  const shared = useContext(Width);
  const {width} = useWindowDimensions();
  return shared ?? layoutWidth(width,null,Platform.OS==='web' && process.env.EXPO_PUBLIC_CLEANPROOF_PHONE_PREVIEW==='1');
}
