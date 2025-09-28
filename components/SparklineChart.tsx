import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width = 100,
  height = 40,
  color = '#10b981',
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipValue, setTooltipValue] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 2, right: 2, bottom: 2, left: 2 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([margin.left, innerWidth + margin.left]);

    const y = d3.scaleLinear()
      .domain(d3.extent(data) as [number, number])
      .range([innerHeight + margin.top, margin.top]);

    const line = d3.line<number>()
      .x((d, i) => x(i))
      .y(d => y(d))
      .curve(d3.curveMonotoneX);

    const area = d3.area<number>()
      .x((d, i) => x(i))
      .y0(innerHeight + margin.top)
      .y1(d => y(d))
      .curve(d3.curveMonotoneX);

    const g = svg.append('g');

    // 添加渐变定义
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'area-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', margin.top)
      .attr('x2', 0).attr('y2', innerHeight + margin.top);

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', color)
      .attr('stop-opacity', 0.3);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', color)
      .attr('stop-opacity', 0.05);

    // 绘制区域
    g.append('path')
      .datum(data)
      .attr('fill', 'url(#area-gradient)')
      .attr('d', area);

    // 绘制线条
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('d', line);

    // 添加圆点
    g.selectAll('.dot')
      .data(data)
      .enter().append('circle')
      .attr('class', 'dot')
      .attr('cx', (d, i) => x(i))
      .attr('cy', d => y(d))
      .attr('r', 0)
      .attr('fill', color)
      .style('opacity', 0);

    // 鼠标悬停效果
    const handleMouseMove = (event: MouseEvent) => {
      const [mouseX] = d3.pointer(event, svgRef.current);
      const dataIndex = Math.round(x.invert(mouseX));

      if (dataIndex >= 0 && dataIndex < data.length) {
        setTooltipValue(data[dataIndex]);
        setTooltipPosition({ x: mouseX, y: y(data[dataIndex]) });

        // 更新圆点显示
        g.selectAll('.dot')
          .attr('r', (d, i) => i === dataIndex ? 4 : 0)
          .style('opacity', (d, i) => i === dataIndex ? 1 : 0);
      }
    };

    const handleMouseLeave = () => {
      setTooltipValue(null);
      g.selectAll('.dot')
        .attr('r', 0)
        .style('opacity', 0);
    };

    svg
      .on('mousemove', handleMouseMove)
      .on('mouseleave', handleMouseLeave);

    return () => {
      svg.on('mousemove', null).on('mouseleave', null);
    };
  }, [data, width, height, color]);

  return (
    <div className={`relative inline-block ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {isHovered && tooltipValue !== null && (
        <div
          className="absolute bg-gray-900 text-white text-xs px-2 py-1 rounded pointer-events-none z-10 whitespace-nowrap"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 30}px`,
            transform: 'translateX(-50%)',
          }}
        >
          {tooltipValue.toFixed(4)}
        </div>
      )}
    </div>
  );
};

export default SparklineChart;