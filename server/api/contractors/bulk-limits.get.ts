export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  
  const configuredLimit = parseInt(config.bulkOperationLimit || '100', 10)
  const bulkOperationLimit = Math.min(configuredLimit, 100)
  
  return {
    bulkOperationLimit,
    exportLimit: 10000,
  }
})
