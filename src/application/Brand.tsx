import {Image, Text, View} from 'react-native';

/** Horizontal mark: the supplied transparent shield plus an accessible wordmark. */
export function Brand({dark = false, compact = false}: {dark?: boolean; compact?: boolean}) {
  const scale = compact ? 0.76 : 1;
  return <View accessible accessibilityLabel="CleanProof, Trusted Proof" style={{flexDirection:'row', alignItems:'center', gap:8, flexShrink:1}}>
    <View accessible={false} style={{width:51*scale, height:58*scale, overflow:'hidden', position:'relative'}}>
      <Image accessible={false} source={require('../../assets/cleanproof-transparent.png')} resizeMode="stretch" style={{position:'absolute', width:130*scale, height:94*scale, left:-39*scale, top:-3*scale}} />
    </View>
    <View accessible={false} style={{justifyContent:'center', flexShrink:1}}>
      <Text numberOfLines={1} style={{color:dark?'#f7fffb':'#103e34', fontSize:24*scale, lineHeight:28*scale, fontWeight:'800', letterSpacing:-0.7}}>CleanProof</Text>
      <Text numberOfLines={1} style={{color:dark?'#a8eecb':'#277d5c', fontSize:9*scale, lineHeight:13*scale, fontWeight:'700', letterSpacing:1.3}}>TRUSTED PROOF</Text>
    </View>
  </View>;
}
