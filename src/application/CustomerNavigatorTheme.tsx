import type {ReactNode} from 'react';
import {DefaultTheme,ThemeProvider} from 'expo-router';
// Screen's OUTER Background uses the theme independently of Stack.contentStyle.
// Keep this object stable: a route change must not restart providers/workspaces.
const customerNavigationTheme={...DefaultTheme,colors:{...DefaultTheme.colors,background:'transparent'}};
export function CustomerNavigatorTheme({children}:{children:ReactNode}){
 return <ThemeProvider value={customerNavigationTheme}>{children}</ThemeProvider>;
}
