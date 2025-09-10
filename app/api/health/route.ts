import { NextResponse } from 'next/server';

// 模拟随机响应时间
const simulateRandomDelay = () => {
  // 随机生成50-500ms的延迟
  return new Promise((resolve) => {
    const delay = Math.floor(Math.random() * 450) + 50;
    setTimeout(resolve, delay);
  });
};

// 模拟随机失败率 (约5%的失败率)
const simulateRandomFailure = () => {
  return Math.random() > 0.95;
};

export async function GET() {
  try {
    // 模拟处理延迟
    await simulateRandomDelay();
    
    // 模拟随机失败
    if (simulateRandomFailure()) {
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
    
    // 正常响应
    return NextResponse.json(
      { 
        status: 'healthy',
        timestamp: Date.now(),
        environment: process.env.NODE_ENV || 'development'
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}