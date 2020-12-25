<template>
  <div id="app">
    <!-- 根路由出口 -->
    <router-view/>
    <p class="text">hello</p>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  name: 'App'
})
</script>

<style lang="scss" scoped>
@import "~@/styles/variables.scss";
.text {
  color: $success-color
}
</style>
