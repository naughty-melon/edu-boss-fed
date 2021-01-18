import axios from 'axios'
import store from '@/store'
import { Message } from 'element-ui'
import router from '@/router'
import qs from 'qs'

const request = axios.create({
  // 配置选项
  // baseURL,
  // timeout
})

const redirectLogin = () => {
  router.push({
    name: 'login',
    query: {
      redirect: router.currentRoute.fullPath
    }
  })
}

async function refreshToken () {
  return await axios.create()({
    method: 'POST',
    url: '/front/user/refresh_token',
    data: qs.stringify({
      refreshtoken: store.state.user.refresh_token
    })
  })
}

// 请求拦截器
request.interceptors.request.use(function (config) {
  // 我们在这里通过改写config配置信息来实现业务功能的统一处理
  const { user } = store.state
  if (user && user.access_token) {
    config.headers.Authorization = store.state.user.access_token
  }
  // 注意：这里一定要返回config，否则请求就发不出去了
  return config
}, function (error) {
  // Do something with request error
  return Promise.reject(error)
})
// 响应拦截器
let isRefreshing = false // 控制刷新token的状态
let requests: any[] = []
request.interceptors.response.use(function (response) {
  // 状态码为2xx的都会进入这里
  // 如果是自定义错误状态码，错误处理就写到这里
  return response
}, async function (error) {
  // 超出2xx的状态码都会执行这里
  // 如果是使用的HTTP状态码，错误处理就写到这里
  if (error.response) {
    // 请求收到响应了，但是状态码超出了2xx范围
    const { status } = error.response
    if (status === 400) {
      Message.error('请求参数错误')
    } else if (status === 401) {
      // token无效（没有提供token，token是无效的，token过期了）
      // 如果有refresh_token则尝试使用refresh_token获取新的access_token
      if (!store.state.user) {
        redirectLogin()
        return Promise.reject(error)
      }
      if (!isRefreshing) {
        isRefreshing = true
        // 尝试刷新获取新的token
        return refreshToken().then(res => {
          if (!res.data.success) {
            throw new Error('刷新Token失败')
          }
          // 成功了->把本次失败的请求重新发出去
          // 把刷新拿到的新的access_token更新到容器和本地存储中
          store.commit('setUser', res.data.content)
          // 把reauests队列中的请求重新发出去
          requests.forEach(cb => cb())
          // 重置requests数组
          requests = []
          return request(error.config)
        }).catch(err => {
          // 把当前登录用户状态清除
          store.commit('setUser', null)
          // 失败了->跳转到登录页重新获取新的token
          redirectLogin()
          return Promise.reject(err)
        }).finally(() => {
          isRefreshing = false // 重置刷新状态
        })
      }
      // 刷新状态下，把请求挂起放到requests数组中
      return new Promise(resolve => {
        requests.push(() => {
          resolve(request(error.config))
        })
      })
    } else if (status === 403) {
      Message.error('没有权限，请联系管理员')
    } else if (status === 404) {
      Message.error('请求资源不存在')
    } else if (status >= 500) {
      Message.error('服务端错误，请联系管理员')
    }
    // 400
    // 401
    // 403
    // 404
    // 500
  } else if (error.request) {
    // 请求发出去没有收到响应（请求超时或网络断开）
    Message.error('请求超时，请刷新重试')
  } else {
    // 在设置请求时发生了一些事情，触发了一个错误
    Message.error(`请求失败：${error.message}`)
  }
  // 把请求失败的错误对象继续抛出，扔给下一个调用者
  return Promise.reject(error)
})

export default request
