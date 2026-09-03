import { createContext, useContext } from "react"

export const ViewerActivityContext = createContext(true)
export const useViewerActive = () => useContext(ViewerActivityContext)
