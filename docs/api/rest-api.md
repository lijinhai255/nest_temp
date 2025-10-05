# RESTful API 文档

## 📋 目录
- [API 概览](#api-概览)
- [认证方式](#认证方式)
- [基础信息](#基础信息)
- [通用响应格式](#通用响应格式)
- [错误处理](#错误处理)
- [API 端点](#api-端点)
- [使用示例](#使用示例)

## 🎯 API 概览

YC Directory 提供了完整的 RESTful API，支持代币查询、交易信息、用户数据等功能。所有 API 都遵循 REST 规范，使用 JSON 格式进行数据交换。

### 基础 URL
```
生产环境: https://api.yc-directory.com/v1
开发环境: http://localhost:3000/api/v1
```

### API 版本
- **当前版本**: v1
- **版本策略**: 语义化版本控制
- **向后兼容**: 保证同一主版本内的向后兼容性

## 🔐 认证方式

### API Key 认证
```http
Authorization: Bearer YOUR_API_KEY
```

获取 API Key：
1. 在 [YC Directory](https://yc-directory.com) 注册账户
2. 在设置页面生成 API Key
3. 在请求头中包含 API Key

### JWT 认证（用户操作）
```http
Authorization: JWT YOUR_JWT_TOKEN
```

## 📊 基础信息

### 请求头
```http
Content-Type: application/json
Accept: application/json
User-Agent: YourApp/1.0
```

### 支持的 HTTP 方法
- `GET` - 获取资源
- `POST` - 创建资源
- `PUT` - 更新资源
- `DELETE` - 删除资源
- `PATCH` - 部分更新资源

### 限流规则
- **免费用户**: 100 请求/分钟
- **付费用户**: 1000 请求/分钟
- **企业用户**: 10000 请求/分钟

## 📝 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": {
    // 具体数据内容
  },
  "message": "操作成功",
  "timestamp": "2025-10-05T10:30:00Z",
  "requestId": "req_123456789"
}
```

### 分页响应
```json
{
  "success": true,
  "data": [
    // 数据数组
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "message": "获取成功",
  "timestamp": "2025-10-05T10:30:00Z",
  "requestId": "req_123456789"
}
```

## ❌ 错误处理

### 错误响应格式
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "参数错误",
    "details": "token_address 格式不正确",
    "field": "token_address"
  },
  "timestamp": "2025-10-05T10:30:00Z",
  "requestId": "req_123456789"
}
```

### 常见错误码
| 错误码 | HTTP状态码 | 描述 |
|--------|------------|------|
| `INVALID_API_KEY` | 401 | API Key 无效 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |
| `INVALID_PARAMETER` | 400 | 参数错误 |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `CHAIN_NOT_SUPPORTED` | 400 | 不支持的区块链 |
| `INSUFFICIENT_BALANCE` | 400 | 余额不足 |

## 🔗 API 端点

### 1. 代币相关

#### 获取代币列表
```http
GET /tokens
```

**查询参数:**
- `chain_id` (可选): 链 ID，默认 1 (Ethereum)
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20，最大 100
- `search` (可选): 搜索关键词

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "address": "0xA0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c",
      "symbol": "WETH",
      "name": "Wrapped Ether",
      "decimals": 18,
      "logoURI": "https://assets.coingecko.com/coins/images/weth.png",
      "chainId": 1,
      "price": {
        "usd": "3456.78",
        "change24h": "2.34"
      },
      "market": {
        "liquidity": "123456789",
        "volume24h": "9876543"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1000,
    "totalPages": 50
  }
}
```

#### 获取代币详情
```http
GET /tokens/{address}
```

**路径参数:**
- `address`: 代币合约地址

**查询参数:**
- `chain_id` (可选): 链 ID

**响应示例:**
```json
{
  "success": true,
  "data": {
    "address": "0xA0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c",
    "symbol": "WETH",
    "name": "Wrapped Ether",
    "decimals": 18,
    "totalSupply": "1000000000000000000000000",
    "logoURI": "https://assets.coingecko.com/coins/images/weth.png",
    "chainId": 1,
    "createdAt": "2023-01-01T00:00:00Z",
    "price": {
      "usd": "3456.78",
      "change24h": "2.34",
      "change7d": "5.67",
      "change30d": "12.34"
    },
    "market": {
      "liquidity": "123456789",
      "volume24h": "9876543",
      "marketCap": "123456789012"
    },
    "holders": 12345,
    "transfers": {
      "total": 123456,
      "24h": 789
    }
  }
}
```

#### 获取代币价格历史
```http
GET /tokens/{address}/price-history
```

**查询参数:**
- `chain_id` (可选): 链 ID
- `interval`: 时间间隔 (`1m`, `5m`, `15m`, `1h`, `4h`, `1d`)
- `start_time`: 开始时间 (Unix 时间戳)
- `end_time`: 结束时间 (Unix 时间戳)

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": 1696464000,
      "price": "3456.78",
      "volume": "1234567"
    },
    {
      "timestamp": 1696467600,
      "price": "3467.89",
      "volume": "1234568"
    }
  ]
}
```

### 2. 流动性池相关

#### 获取池子列表
```http
GET /pools
```

**查询参数:**
- `chain_id` (可选): 链 ID
- `token0` (可选): 第一个代币地址
- `token1` (可选): 第二个代币地址
- `page` (可选): 页码
- `limit` (可选): 每页数量
- `sort_by` (可选): 排序字段 (`liquidity`, `volume`, `fee`)
- `order` (可选): 排序方向 (`asc`, `desc`)

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "id": "0x1234567890abcdef1234567890abcdef12345678",
      "token0": {
        "address": "0xA0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c",
        "symbol": "WETH",
        "name": "Wrapped Ether"
      },
      "token1": {
        "address": "0xB0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c",
        "symbol": "USDC",
        "name": "USD Coin"
      },
      "fee": 3000,
      "liquidity": "123456789",
      "price0": "0.000289",
      "price1": "3456.78",
      "volume24h": "9876543",
      "fees24h": "2962.96",
      "apr": "12.34"
    }
  ]
}
```

#### 获取池子详情
```http
GET /pools/{id}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "id": "0x1234567890abcdef1234567890abcdef12345678",
    "token0": {
      "address": "0xA0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c",
      "symbol": "WETH",
      "name": "Wrapped Ether",
      "reserve": "567890123",
      "price": "3456.78"
    },
    "token1": {
      "address": "0xB0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c",
      "symbol": "USDC",
      "name": "USD Coin",
      "reserve": "987654321",
      "price": "1.00"
    },
    "fee": 3000,
    "liquidity": "123456789",
    "tick": "123456",
    "price0": "0.000289",
    "price1": "3456.78",
    "volume24h": "9876543",
    "fees24h": "2962.96",
    "apr": "12.34",
    "createdAt": "2023-01-01T00:00:00Z",
    "positions": 1234
  }
}
```

### 3. 交易相关

#### 获取交易报价
```http
POST /swap/quote
```

**请求体:**
```json
{
  "tokenIn": "0xA0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c",
  "tokenOut": "0xB0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c",
  "amountIn": "1000000000000000000",
  "chainId": 1,
  "slippageTolerance": 0.5
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "tokenIn": {
      "address": "0xA0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c",
      "symbol": "WETH",
      "amount": "1000000000000000000"
    },
    "tokenOut": {
      "address": "0xB0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c",
      "symbol": "USDC",
      "amount": "3456780000"
    },
    "price": "3456.78",
    "priceImpact": "0.12",
    "minimumAmountOut": "3442661000",
    "gasEstimate": "150000",
    "route": [
      {
        "pool": "0x1234567890abcdef1234567890abcdef12345678",
        "amountIn": "1000000000000000000",
        "amountOut": "3456780000"
      }
    ]
  }
}
```

#### 执行交易
```http
POST /swap/execute
```

**请求体:**
```json
{
  "tokenIn": "0xA0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c",
  "tokenOut": "0xB0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c",
  "amountIn": "1000000000000000000",
  "minimumAmountOut": "3442661000",
  "deadline": 1696464000,
  "chainId": 1,
  "userAddress": "0xabcdef1234567890abcdef1234567890abcdef"
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "transactionHash": "0x1234567890abcdef1234567890abcdef12345678",
    "status": "pending",
    "gasUsed": "145000",
    "gasPrice": "20000000000",
    "estimatedTime": 15
  }
}
```

### 4. 用户相关

#### 获取用户余额
```http
GET /user/balances
```

**查询参数:**
- `address`: 用户地址
- `chain_id` (可选): 链 ID

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "token": {
        "address": "0xA0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c",
        "symbol": "WETH",
        "name": "Wrapped Ether",
        "decimals": 18
      },
      "balance": "1000000000000000000",
      "usdValue": "3456.78",
      "chainId": 1
    }
  ]
}
```

#### 获取用户头寸
```http
GET /user/positions
```

**查询参数:**
- `address`: 用户地址
- `chain_id` (可选): 链 ID
- `status` (可选): 头寸状态 (`active`, `closed`)

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123456",
      "pool": {
        "id": "0x1234567890abcdef1234567890abcdef12345678",
        "token0": "WETH",
        "token1": "USDC"
      },
      "liquidity": "123456789",
      "tickLower": 123450,
      "tickUpper": 123460,
      "tokensOwed0": "123456",
      "tokensOwed1": "789012",
      "unclaimedFees": "123.45",
      "value": "12345.67",
      "status": "active"
    }
  ]
}
```

### 5. 市场数据

#### 获取市场概览
```http
GET /market/overview
```

**查询参数:**
- `chain_id` (可选): 链 ID

**响应示例:**
```json
{
  "success": true,
  "data": {
    "totalLiquidity": "1234567890123",
    "totalVolume24h": "987654321",
    "totalFees24h": "296296",
    "activePools": 12345,
    "activePositions": 123456,
    "topGainers": [
      {
        "token": "TOKEN_A",
        "change24h": "45.67"
      }
    ],
    "topLosers": [
      {
        "token": "TOKEN_B",
        "change24h": "-23.45"
      }
    ]
  }
}
```

#### 获取热门代币
```http
GET /market/trending
```

**查询参数:**
- `chain_id` (可选): 链 ID
- `limit` (可选): 返回数量，默认 10

**响应示例:**
```json
{
  "success": true,
  "data": [
    {
      "token": {
        "address": "0xA0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c",
        "symbol": "WETH",
        "name": "Wrapped Ether"
      },
      "price": "3456.78",
      "change24h": "12.34",
      "volume24h": "9876543",
      "liquidity": "123456789"
    }
  ]
}
```

## 📚 使用示例

### JavaScript/TypeScript 示例

```typescript
// API 客户端封装
class YCDirectoryAPI {
  private baseURL = 'https://api.yc-directory.com/v1';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    return response.json();
  }

  // 获取代币列表
  async getTokens(params?: {
    chainId?: number;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/tokens?${query}`);
  }

  // 获取交易报价
  async getSwapQuote(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    chainId: number;
    slippageTolerance?: number;
  }) {
    return this.request('/swap/quote', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // 执行交易
  async executeSwap(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    minimumAmountOut: string;
    deadline: number;
    chainId: number;
    userAddress: string;
  }) {
    return this.request('/swap/execute', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}

// 使用示例
const api = new YCDirectoryAPI('your-api-key-here');

// 获取 WETH/USDC 池子信息
const pools = await api.getTokens({
  chainId: 1,
  search: 'WETH'
});

// 获取交易报价
const quote = await api.getSwapQuote({
  tokenIn: '0xA0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c',
  tokenOut: '0xB0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c',
  amountIn: '1000000000000000000', // 1 WETH
  chainId: 1,
  slippageTolerance: 0.5
});

console.log('预期获得 USDC:', quote.data.tokenOut.amount);
console.log('价格影响:', quote.data.priceImpact);
```

### Python 示例

```python
import requests
from typing import Dict, Any, Optional

class YCDirectoryAPI:
    def __init__(self, api_key: str):
        self.base_url = 'https://api.yc-directory.com/v1'
        self.api_key = api_key
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        }

    def _request(self, endpoint: str, method: str = 'GET', data: Optional[Dict] = None) -> Dict[str, Any]:
        url = f"{self.base_url}{endpoint}"

        response = requests.request(
            method=method,
            url=url,
            headers=self.headers,
            json=data
        )

        response.raise_for_status()
        return response.json()

    def get_tokens(self, **params) -> Dict[str, Any]:
        query_string = '&'.join(f"{k}={v}" for k, v in params.items())
        return self._request(f"/tokens?{query_string}")

    def get_swap_quote(self, params: Dict) -> Dict[str, Any]:
        return self._request('/swap/quote', method='POST', data=params)

# 使用示例
api = YCDirectoryAPI('your-api-key-here')

# 获取代币列表
tokens = api.get_tokens(chain_id=1, page=1, limit=20)
print(f"找到 {tokens['pagination']['total']} 个代币")

# 获取交易报价
quote = api.get_swap_quote({
    'tokenIn': '0xA0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c',
    'tokenOut': '0xB0b86a33E6416c8C8c4e0C4d2C8C4c4C4c4c4c4c',
    'amountIn': '1000000000000000000',
    'chainId': 1,
    'slippageTolerance': 0.5
})

print(f"预期获得: {quote['data']['tokenOut']['amount']} USDC")
```

## 🔄 SDK 和库

### 官方 SDK

- **JavaScript/TypeScript**: `@yc-directory/api-client`
- **Python**: `yc-directory-python`
- **Go**: `yc-directory-go`

### 安装和使用

```bash
# JavaScript/TypeScript
npm install @yc-directory/api-client

# Python
pip install yc-directory-python
```

```typescript
import { YCDirectoryAPI } from '@yc-directory/api-client';

const api = new YCDirectoryAPI('your-api-key');
const tokens = await api.tokens.list({ chainId: 1 });
```

---

**文档维护**: API 团队
**最后更新**: 2025-10-05
**版本**: v1.0.0