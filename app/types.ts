// Define the types of learning modes
export type LearningMode = "readymade" | "build" | "review" | null

// Define the reference structure
export interface Reference {
  id?: string
  type: "image" | "video" | "article"
  title: string
  description: string
  url: string
}
