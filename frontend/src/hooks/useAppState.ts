import React, { useCallback, useReducer } from "react";
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
    typeof value === "function" ? (value as (prev: T) => T)(prev) : value;

  switch (action.type) {
    case "setFocusedClip": {
      const next = resolve(action.value, state.focusedClip);
      return Object.is(next, state.focusedClip) ? state : { ...state, focusedClip: next };
    }
    case "setSelectedClips": {
      const next = resolve(action.value, state.selectedClips);
      return Object.is(next, state.selectedClips) ? state : { ...state, selectedClips: next };
    }
    case "setClips": {
      const next = resolve(action.value, state.clips);
      return Object.is(next, state.clips) ? state : { ...state, clips: next };
    }
    case "setEpisodes": {
      const next = resolve(action.value, state.episodes);
      return Object.is(next, state.episodes) ? state : { ...state, episodes: next };
    }
    case "setSelectedEpisodeId": {
      const next = resolve(action.value, state.selectedEpisodeId);
      return Object.is(next, state.selectedEpisodeId) ? state : { ...state, selectedEpisodeId: next };
    }
    case "setEpisodeFolders": {
      const next = resolve(action.value, state.episodeFolders);
      return Object.is(next, state.episodeFolders) ? state : { ...state, episodeFolders: next };
    }
    case "setOpenedEpisodeId": {
      const next = resolve(action.value, state.openedEpisodeId);
      return Object.is(next, state.openedEpisodeId) ? state : { ...state, openedEpisodeId: next };
    }
    case "setSelectedFolderId": {
      const next = resolve(action.value, state.selectedFolderId);
      return Object.is(next, state.selectedFolderId) ? state : { ...state, selectedFolderId: next };
    }
    case "setImportedVideoPath": {
      const next = resolve(action.value, state.importedVideoPath);
      return Object.is(next, state.importedVideoPath) ? state : { ...state, importedVideoPath: next };
    }
    case "setVideoIsHEVC": {
      const next = resolve(action.value, state.videoIsHEVC);
      return Object.is(next, state.videoIsHEVC) ? state : { ...state, videoIsHEVC: next };
    }
    default: return state;
  }
}

export default function useAppState() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const setFocusedClip = useCallback(
    (value: React.SetStateAction<string | null>) => dispatch({ type: "setFocusedClip", value }),
    [dispatch]
  );
  const setSelectedClips = useCallback(
    (value: React.SetStateAction<Set<string>>) => dispatch({ type: "setSelectedClips", value }),
    [dispatch]
  );
  const setClips = useCallback(
    (value: React.SetStateAction<ClipItem[]>) => dispatch({ type: "setClips", value }),
    [dispatch]
  );
  const setEpisodes = useCallback(
    (value: React.SetStateAction<EpisodeEntry[]>) => dispatch({ type: "setEpisodes", value }),
    [dispatch]
  );
  const setSelectedEpisodeId = useCallback(
    (value: React.SetStateAction<string | null>) => dispatch({ type: "setSelectedEpisodeId", value }),
    [dispatch]
  );
  const setEpisodeFolders = useCallback(
    (value: React.SetStateAction<EpisodeFolder[]>) => dispatch({ type: "setEpisodeFolders", value }),
    [dispatch]
  );
  const setOpenedEpisodeId = useCallback(
    (value: React.SetStateAction<string | null>) => dispatch({ type: "setOpenedEpisodeId", value }),
    [dispatch]
  );
  const setSelectedFolderId = useCallback(
    (value: React.SetStateAction<string | null>) => dispatch({ type: "setSelectedFolderId", value }),
    [dispatch]
  );
  const setImportedVideoPath = useCallback(
    (value: React.SetStateAction<string | null>) => dispatch({ type: "setImportedVideoPath", value }),
    [dispatch]
  );
  const setVideoIsHEVC = useCallback(
    (value: React.SetStateAction<boolean | null>) => dispatch({ type: "setVideoIsHEVC", value }),
    [dispatch]
  );

  return {
    state,
    dispatch,
    setFocusedClip,
    setSelectedClips,
    setClips,
    setEpisodes,
    setSelectedEpisodeId,
    setEpisodeFolders,
    setOpenedEpisodeId,
    setSelectedFolderId,
    setImportedVideoPath,
    setVideoIsHEVC,
  };
}
