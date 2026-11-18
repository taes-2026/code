import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { getExpiringItems } from '@/domain/expiration'
import type { InventoryItem } from '@/types/item'

export type NotificationPermissionState = NotificationPermission | 'unsupported'

const CHECK_INTERVAL_MS = 60_000

const notifiedIds = new Set<string>()

function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'

  return Notification.permission
}

export function useExpirationAlerts(items: Ref<InventoryItem[]>) {
  const now = ref(new Date())
  const permission = ref<NotificationPermissionState>(getNotificationPermission())
  const expiring = computed(() => getExpiringItems(items.value, now.value))

  let clock: ReturnType<typeof setInterval> | undefined

  function alertKey(item: InventoryItem): string {
    return `${item.id}:${item.expirationDate}`
  }

  function sendNotification(newItems: InventoryItem[]) {
    if (permission.value !== 'granted') return

    const names = newItems.map((item) => item.name)
    const body =
      newItems.length === 1
        ? `${names[0]} está prestes a expirar.`
        : `${newItems.length} produtos estão prestes a expirar: ${names.join(', ')}.`

    try {
      new Notification('SmartPantry', {
        body,
        icon: '/favicon.ico',
        tag: 'smartpantry-expiration',
      })
    } catch {
      return
    }
  }

  function alertNewItems(current: InventoryItem[], force = false) {
    const newItems = current.filter((item) => force || !notifiedIds.has(alertKey(item)))

    if (newItems.length === 0) return

    for (const item of newItems) notifiedIds.add(alertKey(item))

    sendNotification(newItems)
  }

  async function enableNotifications() {
    if (permission.value === 'unsupported' || permission.value === 'granted') return

    try {
      permission.value = await Notification.requestPermission()
    } catch {
      return
    }

    if (permission.value === 'granted') alertNewItems(expiring.value, true)
  }

  onMounted(() => {
    alertNewItems(expiring.value)

    clock = setInterval(() => {
      now.value = new Date()
    }, CHECK_INTERVAL_MS)
  })

  onUnmounted(() => {
    clearInterval(clock)
  })

  watch(expiring, (current) => {
    alertNewItems(current)
  })

  return {
    now,
    permission,
    expiring,
    enableNotifications,
  }
}
