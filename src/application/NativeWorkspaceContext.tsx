import {createContext,useContext} from 'react';
import type {WorkspaceHandle} from '../storage/expoWorkspace';
export const NativeWorkspaceContext=createContext<WorkspaceHandle|null>(null);
export const useNativeWorkspace=()=>useContext(NativeWorkspaceContext);
