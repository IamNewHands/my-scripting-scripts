import { AppIntentManager, AppIntentProtocol, Widget, Notification } from "scripting"
import { getStoredAuth, ghRequest, recordWidgetTrigger } from "./src/actions/github"

export const RunWorkflowIntent = AppIntentManager.register<string>({
  name: "RunWorkflowIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (payload: string) => {
    try {
      const { owner, repo, workflowId, branch } = JSON.parse(payload)
      const auth = getStoredAuth()
      if (!auth || !owner || !repo || !workflowId) return
      await ghRequest(
        `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
        auth.token,
        { method: 'POST', body: JSON.stringify({ ref: branch || 'main', inputs: {} }) }
      )
      recordWidgetTrigger(owner, repo, workflowId)
      // 记录触发时间供小组件展示反馈，并发本地通知
      Storage.set('widget_last_triggered_at', Date.now())
      try {
        await Notification.schedule({
          title: 'GitHub 工具箱',
          body: `✅ 已触发 ${owner}/${repo} 工作流`,
        })
      } catch (_) { }
    } catch (_) {
    }
    Widget.reloadAll()
  },
})
