import React, { useReducer } from "react";
import { ClipItem, EpisodeEntry, EpisodeFolder } from "../types/domain";

export type AppState = {
  focusedClip: string | null;
  selectedClips: Set<string>;
  clips: ClipItem[];
  episodes: EpisodeEntry[];
  selectedEpisodeId: string | null;
  episodeFolders: EpisodeFolder[];
  openedEpisodeId: string | null;
  selectedFolderId: string | null;
  importedVideoPath: string | null;
  videoIsHEVC: boolean | null;
};

export type AppAction =
  | { type: "setFocusedClip"; value: React.SetStateAction<string | null> }
  | { type: "setSelectedClips"; value: React.SetStateAction<Set<string>> }
  | { type: "setClips"; value: React.SetStateAction<ClipItem[]> }
  | { type: "setEpisodes"; value: React.SetStateAction<EpisodeEntry[]> }
  | { type: "setSelectedEpisodeId"; value: React.SetStateAction<string | null> }
  | { type: "setEpisodeFolders"; value: React.SetStateAction<EpisodeFolder[]> }
  | { type: "setOpenedEpisodeId"; value: React.SetStateAction<string | null> }
  | { type: "setSelectedFolderId"; value: React.SetStateAction<string | null> }
  | { type: "setImportedVideoPath"; value: React.SetStateAction<string | null> }
  | { type: "setVideoIsHEVC"; value: React.SetStateAction<boolean | null> };

const initialState: AppState = {
  focusedClip: null,
  selectedClips: new Set(),
  clips: [],
  episodes: [],
  selectedEpisodeId: null,
  episodeFolders: [],
  openedEpisodeId: null,
  selectedFolderId: null,
  importedVideoPath: null,
  videoIsHEVC: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  const resolve = <T,>(value: React.SetStateAction<T>, prev: T): T =>
    typeof value === "function"
      ? (value as (previous: T) => T)(prev)
      : value;

  switch (action.type) {
    case "setFocusedClip":
      return { ...state, focusedClip: resolve(action.value, state.focusedClip) };
    case "setSelectedClips":
      return { ...state, selectedClips: resolve(action.value, state.selectedClips) };
    case "setClips":
      return { ...state, clips: resolve(action.value, state.clips) };
    case "setEpisodes":
      return { ...state, episodes: resolve(action.value, state.episodes) };
    case "setSelectedEpisodeId":
      return { ...state, selectedEpisodeId: resolve(action.value, state.selectedEpisodeId) };
    case "setEpisodeFolders":
      return { ...state, episodeFolders: resolve(action.value, state.episodeFolders) };
    case "setOpenedEpisodeId":
      return { ...state, openedEpisodeId: resolve(action.value, state.openedEpisodeId) };
    case "setSelectedFolderId":
      return { ...state, selectedFolderId: resolve(action.value, state.selectedFolderId) };
    case "setImportedVideoPath":
      return { ...state, importedVideoPath: resolve(action.value, state.importedVideoPath) };
    case "setVideoIsHEVC":
      return { ...state, videoIsHEVC: resolve(action.value, state.videoIsHEVC) };
    default: return state;
  }
}

export default function useAppState() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  function makeReducerSetter<T>(type: AppAction["type"]) {
    return (value: React.SetStateAction<T>) => {
      dispatch({ type, value } as AppAction);
    };
  }

  return {
    state,
    dispatch,
    setFocusedClip: makeReducerSetter<string | null>("setFocusedClip"),
    setSelectedClips: makeReducerSetter<Set<string>>("setSelectedClips"),
    setClips: makeReducerSetter<ClipItem[]>("setClips"),
    setEpisodes: makeReducerSetter<EpisodeEntry[]>("setEpisodes"),
    setSelectedEpisodeId: makeReducerSetter<string | null>("setSelectedEpisodeId"),
    setEpisodeFolders: makeReducerSetter<EpisodeFolder[]>("setEpisodeFolders"),
    setOpenedEpisodeId: makeReducerSetter<string | null>("setOpenedEpisodeId"),
    setSelectedFolderId: makeReducerSetter<string | null>("setSelectedFolderId"),
    setImportedVideoPath: makeReducerSetter<string | null>("setImportedVideoPath"),
    setVideoIsHEVC: makeReducerSetter<boolean | null>("setVideoIsHEVC"),
  };
}
