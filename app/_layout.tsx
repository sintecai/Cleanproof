import {useEffect} from 'react';
import {Platform} from 'react-native';
import {CustomerNavigatorTheme} from '../src/application/CustomerNavigatorTheme';
import {LayoutFrame} from '../src/application/LayoutFrame';
import {router} from 'expo-router';
import {takeCustomerDestination} from '../src/application/customerSession';
import {startupTrace} from '../src/auth/startupTrace';
import { StorageBoundary } from "../src/application/StorageBoundary";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WorkspaceProvider, useWorkspace } from "../src/application/workspace";
import { BusinessGate, WorkspaceAccessScreen } from "../src/application/BusinessGate";
// Stable screen layout identity: workspace revisions must not remount gates/screens.
function SharedBusinessAccess({children}:{children:import('react').ReactNode}){
 const {handle,reopen}=useWorkspace();
 return <BusinessGate handle={handle} onWorkspaceChange={reopen}>{children}</BusinessGate>;
}
function ApplicationNavigator() {
  useEffect(()=>{
    startupTrace('navigator-mounted');
    // Load route modules once after the authenticated workspace mounts. This
    // avoids a cold, blank split-bundle fetch on the first tab change without
    // mounting screens or touching their data. Access checks still run normally.
    if (Platform.OS === 'web') {
      void Promise.allSettled([import('./index'), import('./sites'), import('./new-inspection'), import('./actions'), import('./history')]);
    }
    const destination=takeCustomerDestination();
    if(destination){startupTrace('route-request');router.replace(destination as '/');}
  },[]);
  return <CustomerNavigatorTheme><Stack screenOptions={{headerShown:false, animation: Platform.OS === "web" ? "none" : "default", contentStyle:{backgroundColor:"transparent"}}} screenLayout={WorkspaceAccessScreen}/></CustomerNavigatorTheme>;
}
export default function RootLayout() {
  const content = (
    <SafeAreaProvider>
      <StorageBoundary>
        <WorkspaceProvider>
          <SharedBusinessAccess><ApplicationNavigator /></SharedBusinessAccess>
        </WorkspaceProvider>
      </StorageBoundary>
    </SafeAreaProvider>
  );
  return <LayoutFrame>{content}</LayoutFrame>;
}
