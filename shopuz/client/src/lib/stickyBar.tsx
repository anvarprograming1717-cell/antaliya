import React, { createContext, useContext, useState, useCallback } from "react";

type StickyBarContextType = {
  setBottomBar: (node: React.ReactNode) => void;
  bottomBar: React.ReactNode;
};

const StickyBarContext = createContext<StickyBarContextType>({
  setBottomBar: () => {},
  bottomBar: null,
});

export function StickyBarProvider({ children }: { children: React.ReactNode }) {
  const [bottomBar, setBottomBarState] = useState<React.ReactNode>(null);
  const setBottomBar = useCallback((node: React.ReactNode) => {
    setBottomBarState(node);
  }, []);
  return (
    <StickyBarContext.Provider value={{ setBottomBar, bottomBar }}>
      {children}
    </StickyBarContext.Provider>
  );
}

export function useStickyBar() {
  return useContext(StickyBarContext);
}
