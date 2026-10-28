import React, { useEffect, useRef, useState } from 'react';
import type { GraphData, GraphNode, GraphEdge } from '../types';
import { useAppStore } from '../store/useAppStore';
import { ZoomIn, ZoomOut, RotateCcw, Share2 } from 'lucide-react';

interface SimilarityGraphViewProps {
  data: GraphData;
  onSelectPaper: (paperId: string) => void;
  selectedPaperId?: string | null;
}

const PALETTE = [
  '#5B8CFF', // Indigo Blue
  '#22D3EE', // Cyan
  '#8B7BFF', // Violet
  '#34D399', // Emerald Green
  '#FBBF24', // Amber
  '#F472B6', // Pink
];

export const SimilarityGraphView: React.FC<SimilarityGraphViewProps> = ({ 
  data, 
  onSelectPaper,
  selectedPaperId 
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Node position simulation state
  const nodesRef = useRef<Array<GraphNode & { vx: number; vy: number; x: number; y: number }>>([]);

  useEffect(() => {
    if (!data.nodes || data.nodes.length === 0) return;

    // Initialize positions in a circle
    const count = data.nodes.length;
    const radius = Math.min(220, count * 55 + 50);
    
    nodesRef.current = data.nodes.map((node, i) => {
      const angle = (i / count) * 2 * Math.PI;
      return {
        ...node,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });
  }, [data]);

  // Animation frame loop for force simulation
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
      ctx.scale(zoom, zoom);

      const nodes = nodesRef.current;

      // Force simulation step
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          // Repulsion
          if (dist < 260) {
            const force = (260 - dist) / 18;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            nodes[i].vx -= fx * 0.05;
            nodes[i].vy -= fy * 0.05;
            nodes[j].vx += fx * 0.05;
            nodes[j].vy += fy * 0.05;
          }
        }
        // Center gravity
        nodes[i].vx -= nodes[i].x * 0.01;
        nodes[i].vy -= nodes[i].y * 0.01;

        // Apply friction
        nodes[i].vx *= 0.85;
        nodes[i].vy *= 0.85;
        nodes[i].x += nodes[i].vx;
        nodes[i].y += nodes[i].vy;
      }

      // Draw Edges
      data.links.forEach((link) => {
        const sourceNode = nodes.find((n) => n.id === link.source);
        const targetNode = nodes.find((n) => n.id === link.target);
        if (!sourceNode || !targetNode) return;

        const isHovered = hoveredEdge === link;
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.strokeStyle = isHovered 
          ? 'rgba(34, 211, 238, 0.9)' 
          : `rgba(91, 140, 255, ${Math.max(0.15, link.weight * 0.8)})`;
        ctx.lineWidth = isHovered ? 2.5 : Math.max(1, link.weight * 4);
        ctx.stroke();

        // Draw similarity weight text
        if (link.weight >= 0.15 || isHovered) {
          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;
          ctx.fillStyle = isHovered ? '#22D3EE' : '#6F7BA0';
          ctx.font = '10px JetBrains Mono';
          ctx.fillText(`${Math.round(link.weight * 100)}%`, midX + 3, midY - 3);
        }
      });

      // Draw Nodes
      nodes.forEach((node, idx) => {
        const isSelected = selectedPaperId === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const color = PALETTE[idx % PALETTE.length];

        // Glow ring if selected or hovered
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 22, 0, 2 * Math.PI);
          ctx.fillStyle = `${color}33`;
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Main node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, 14, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Paper Title label
        ctx.fillStyle = '#E8ECF8';
        ctx.font = isSelected ? 'bold 12px Inter' : '11px Inter';
        ctx.textAlign = 'center';
        const label = node.title.length > 24 ? node.title.slice(0, 22) + '...' : node.title;
        ctx.fillText(label, node.x, node.y + 28);

        // Year label
        ctx.fillStyle = '#A3ADCB';
        ctx.font = '9px JetBrains Mono';
        ctx.fillText(String(node.year), node.x, node.y + 40);
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [data, offset, zoom, selectedPaperId, hoveredNode, hoveredEdge]);

  // Handle canvas clicks & hovers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - canvas.width / 2 - offset.x;
    const mouseY = e.clientY - rect.top - canvas.height / 2 - offset.y;

    const unscaledX = mouseX / zoom;
    const unscaledY = mouseY / zoom;

    // Check hit test for nodes
    const foundNode = nodesRef.current.find((n) => {
      const d = Math.sqrt((n.x - unscaledX) ** 2 + (n.y - unscaledY) ** 2);
      return d <= 18;
    });

    setHoveredNode(foundNode || null);

    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleClick = () => {
    if (hoveredNode) {
      onSelectPaper(hoveredNode.id);
    }
  };

  return (
    <div className="relative w-full h-[540px] bg-base border border-border rounded-card overflow-hidden select-none">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={900}
        height={540}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseDown={(e) => {
          setIsDragging(true);
          setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => {
          setIsDragging(false);
          setHoveredNode(null);
        }}
      />

      {/* Floating Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 p-1 bg-surface/90 border border-border rounded-control shadow-card">
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
          className="p-1.5 rounded hover:bg-raised text-text-secondary hover:text-text-primary"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
          className="p-1.5 rounded hover:bg-raised text-text-secondary hover:text-text-primary"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
          className="p-1.5 rounded hover:bg-raised text-text-secondary hover:text-text-primary"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Hover Info Tooltip */}
      {hoveredNode && (
        <div className="absolute top-4 left-4 max-w-xs p-3 bg-surface/95 border border-accent-primary/40 rounded-card shadow-dialog backdrop-blur-md pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan" />
            <span className="text-xs font-mono text-accent-cyan">{hoveredNode.year}</span>
          </div>
          <h4 className="text-xs font-semibold text-text-primary line-clamp-2">
            {hoveredNode.title}
          </h4>
          <p className="text-[11px] text-text-secondary mt-1 truncate">
            {hoveredNode.authors}
          </p>
          <div className="text-[10px] text-accent-primary mt-2 font-mono">
            Click to inspect paper breakdown →
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted">
          <Share2 className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">No papers in graph yet.</p>
        </div>
      )}
    </div>
  );
};
