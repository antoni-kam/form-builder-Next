"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import {
  Circle,
  FileText,
  Plus,
  MoreHorizontal,
  Flag,
  Edit2,
  Copy,
  Files,
  Trash2,
  CheckCircle,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface FormPage {
  id: string
  name: string
  icon: "info-icon" | "document" | "check" | "filled-circle"
  type: "info" | "details" | "other" | "ending"
  isNew?: boolean
}

interface ContextMenuState {
  isOpen: boolean
  pageId: string | null
}

const ANIMATION_DURATION = {
  fast: 200,
  medium: 300,
  slow: 400,
} as const

const SPACING_CONFIG = {
  short: "mx-3",
  long: "mx-6",
  dotted: {
    short: "w-6",
    long: "w-12",
  },
} as const

export default function FormBuilder() {
  const [pages, setPages] = useState<FormPage[]>([
    { id: "1", name: "Info", icon: "info-icon", type: "info" },
    { id: "2", name: "Details", icon: "document", type: "details" },
    { id: "3", name: "Other", icon: "document", type: "other" },
    { id: "4", name: "Ending", icon: "check", type: "ending" },
  ])

  const [activePage, setActivePage] = useState<string | null>(null)
  const [hoveredPage, setHoveredPage] = useState<string | null>(null)
  const [hoveredInsertIndex, setHoveredInsertIndex] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ isOpen: false, pageId: null })
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)

  const contextMenuRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return

      const items = Array.from(pages)
      const [reorderedItem] = items.splice(result.source.index, 1)
      items.splice(result.destination.index, 0, reorderedItem)
      setPages(items)
    },
    [pages],
  )

  const addPage = useCallback((insertIndex: number, isMainAddButton = false) => {
    const newPage: FormPage = {
      id: Date.now().toString(),
      name: "New Page",
      icon: "document",
      type: "other",
      isNew: true,
    }

    setPages((prev) => {
      const newPages = [...prev]
      const targetIndex = isMainAddButton ? prev.length - 1 : insertIndex
      newPages.splice(targetIndex, 0, newPage)
      return newPages
    })

    setTimeout(() => {
      setPages((prev) => prev.map((page) => (page.id === newPage.id ? { ...page, isNew: false } : page)))
    }, ANIMATION_DURATION.medium)

    setActivePage(newPage.id)
  }, [])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, pageId: string) => {
      e.preventDefault()

      const page = pages.find((p) => p.id === pageId)
      if (page && (page.type === "info" || page.type === "ending")) return

      const rect = (e.target as HTMLElement).getBoundingClientRect()
      setContextMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      })

      setContextMenu({ isOpen: true, pageId })
    },
    [pages],
  )

  const closeContextMenu = useCallback(() => {
    setContextMenu({ isOpen: false, pageId: null })
    setContextMenuPosition(null)
  }, [])

  const checkScrollButtons = useCallback(() => {
    if (!scrollContainerRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
  }, [])

  const scroll = useCallback((direction: "left" | "right") => {
    if (!scrollContainerRef.current) return

    const scrollAmount = direction === "left" ? -200 : 200
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" })
  }, [])

  const getIcon = useCallback((iconType: FormPage["icon"], isActive: boolean) => {
    const className = `w-4 h-4 transition-colors duration-${ANIMATION_DURATION.fast} ${
      isActive ? "text-orange-500" : "text-gray-400"
    }`

    const iconMap = {
      "info-icon": Info,
      circle: Circle,
      "filled-circle": Circle,
      check: CheckCircle,
      document: FileText,
    }

    const IconComponent = iconMap[iconType] || FileText
    return <IconComponent className={iconType === "filled-circle" ? `${className} fill-current` : className} />
  }, [])

  const shouldShowSettings = useCallback((pageType: string) => pageType !== "info" && pageType !== "ending", [])

  const shouldShowPlusButton = useCallback(
    (currentPage: FormPage, nextPage: FormPage) => currentPage.type !== "info" && nextPage.type !== "ending",
    [],
  )

  const getSpacingConfig = useCallback((currentPage: FormPage, nextPage: FormPage) => {
    const isShortSpacing = currentPage.type === "info" || nextPage.type === "ending"
    return {
      spacing: isShortSpacing ? SPACING_CONFIG.short : SPACING_CONFIG.long,
      dottedWidth: isShortSpacing ? SPACING_CONFIG.dotted.short : SPACING_CONFIG.dotted.long,
    }
  }, [])

  const getButtonStyles = useCallback((isActive: boolean, isHovered: boolean, isDragging: boolean, isNew: boolean) => {
    const baseStyles =
      "flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer relative whitespace-nowrap transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:bg-white focus:text-gray-900"

    let stateStyles = ""
    if (isActive) {
      stateStyles = isHovered
        ? "text-gray-900 bg-white border-2 border-blue-400 shadow-md transform scale-105"
        : "text-gray-900 bg-white border border-gray-200 shadow-md"
    } else {
      stateStyles = isHovered
        ? "text-gray-600 bg-gray-200 border border-transparent transform scale-102"
        : "text-gray-500 bg-gray-100 border border-transparent"
    }

    const modifierStyles = [isNew && "animate-slideInScale", isDragging && "shadow-lg rotate-1 z-10 scale-105"]
      .filter(Boolean)
      .join(" ")

    return `${baseStyles} ${stateStyles} ${modifierStyles}`
  }, [])

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        closeContextMenu()
      }
    },
    [closeContextMenu],
  )

  useEffect(() => {
    if (contextMenu.isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [contextMenu.isOpen, handleClickOutside])

  useEffect(() => {
    checkScrollButtons()
    const handleResize = () => checkScrollButtons()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [pages, checkScrollButtons])

  const ScrollButton = ({
    direction,
    visible,
    onClick,
  }: {
    direction: "left" | "right"
    visible: boolean
    onClick: () => void
  }) => (
    <div
      className={`absolute ${direction}-2 top-1/2 transform -translate-y-1/2 z-20 transition-all duration-300 ${
        visible
          ? "opacity-100 translate-x-0"
          : `opacity-0 ${direction === "left" ? "-translate-x-2" : "translate-x-2"} pointer-events-none`
      }`}
    >
      <button
        onClick={onClick}
        className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200 text-gray-600 hover:text-gray-800 hover:scale-105 active:scale-95"
      >
        {direction === "left" ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  )

  const GradientOverlay = ({ direction, visible }: { direction: "left" | "right"; visible: boolean }) => (
    <div
      className={`absolute ${direction}-0 top-0 bottom-0 w-12 bg-gradient-to-${direction === "left" ? "r" : "l"} from-gray-50 to-transparent z-10 pointer-events-none rounded-${direction === "left" ? "l" : "r"}-lg transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    />
  )

  const menuItems = [
    { icon: Flag, label: "Set as first page", color: "text-blue-500" },
    { icon: Edit2, label: "Rename", color: "text-gray-500" },
    { icon: Copy, label: "Copy", color: "text-gray-500" },
    { icon: Files, label: "Duplicate", color: "text-gray-500" },
  ]

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-6xl">
        <div className="bg-gray-50 rounded-lg p-6 relative">
          <ScrollButton direction="left" visible={canScrollLeft} onClick={() => scroll("left")} />
          <ScrollButton direction="right" visible={canScrollRight} onClick={() => scroll("right")} />
          <GradientOverlay direction="left" visible={canScrollLeft} />
          <GradientOverlay direction="right" visible={canScrollRight} />

          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide scroll-smooth"
            onScroll={checkScrollButtons}
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="pages" direction="horizontal">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="flex items-center justify-center min-w-max px-4"
                  >
                    {pages.map((page, index) => {
                      const nextPage = pages[index + 1]
                      const spacingConfig = nextPage ? getSpacingConfig(page, nextPage) : null

                      return (
                        <div key={page.id} className="flex items-center">
                          <Draggable draggableId={page.id} index={index}>
                            {(provided, snapshot) => {
                              const isActive = activePage === page.id
                              const isHovered = hoveredPage === page.id

                              return (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={getButtonStyles(isActive, isHovered, snapshot.isDragging, !!page.isNew)}
                                  tabIndex={0}
                                  onClick={() => setActivePage(page.id)}
                                  onContextMenu={(e) => handleContextMenu(e, page.id)}
                                  onMouseEnter={() => setHoveredPage(page.id)}
                                  onMouseLeave={() => setHoveredPage(null)}
                                >
                                  {getIcon(page.icon, isActive)}
                                  <span className="text-sm font-medium transition-colors duration-200">
                                    {page.name}
                                  </span>
                                  {isActive && shouldShowSettings(page.type) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleContextMenu(e, page.id)
                                      }}
                                      className="ml-1 p-1 hover:bg-gray-100 rounded transition-all duration-200 text-gray-600 hover:scale-110 active:scale-95 animate-slideInScale"
                                    >
                                      <MoreHorizontal className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )
                            }}
                          </Draggable>

                          {nextPage && (
                            <div
                              className={`relative flex items-center ${spacingConfig.spacing} transition-all duration-300`}
                            >
                              <div
                                className={`${spacingConfig.dottedWidth} h-px border-t border-dotted border-gray-300 transition-all duration-300`}
                              />
                              {shouldShowPlusButton(page, nextPage) && (
                                <div
                                  className={`absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                                    hoveredInsertIndex === index + 1 ? "scale-110" : "scale-100"
                                  }`}
                                  onMouseEnter={() => setHoveredInsertIndex(index + 1)}
                                  onMouseLeave={() => setHoveredInsertIndex(null)}
                                >
                                  <button
                                    onClick={() => addPage(index + 1)}
                                    className="w-6 h-6 bg-white border border-gray-200 text-gray-600 hover:text-gray-800 hover:border-gray-300 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md z-10 hover:scale-110 active:scale-95"
                                  >
                                    <Plus className="w-3 h-3 transition-transform duration-200" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {provided.placeholder}

                    <div className="flex items-center ml-4">
                      <div className="w-6 h-px border-t border-dotted border-gray-300 mr-4 transition-all duration-300" />
                      <button
                        onClick={() => addPage(pages.length, true)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700 transition-all duration-300 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md whitespace-nowrap hover:scale-105 active:scale-95"
                      >
                        <Plus className="w-4 h-4 transition-transform duration-200" />
                        <span className="text-sm font-medium">Add page</span>
                      </button>
                    </div>
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>

        <div
          className={`fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-48 transition-all duration-300 ease-out ${
            contextMenu.isOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-2 pointer-events-none"
          }`}
          ref={contextMenuRef}
          style={{
            left: contextMenuPosition ? `${contextMenuPosition.x}px` : "50%",
            top: contextMenuPosition ? `${contextMenuPosition.y}px` : "50%",
            transform: contextMenuPosition
              ? `translateX(-50%) translateY(-100%) ${contextMenu.isOpen ? "scale(1)" : "scale(0.95)"}`
              : `translate(-50%, -50%) ${contextMenu.isOpen ? "scale(1)" : "scale(0.95)"}`,
          }}
        >
          <div className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-100">Settings</div>
          {menuItems.map(({ icon: Icon, label, color }) => (
            <button
              key={label}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:translate-x-1"
            >
              <Icon className={`w-4 h-4 ${color} transition-transform duration-200`} />
              {label}
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 hover:translate-x-1">
              <Trash2 className="w-4 h-4 transition-transform duration-200" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        @keyframes slideInScale {
          0% {
            opacity: 0;
            transform: translateX(-20px) scale(0.8);
          }
          50% {
            opacity: 0.8;
            transform: translateX(0) scale(1.05);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        
        .animate-slideInScale {
          animation: slideInScale 0.4s ease-out;
        }
        
        .scale-102 {
          transform: scale(1.02);
        }
        
        .scroll-smooth {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  )
}
