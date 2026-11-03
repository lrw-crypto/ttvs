"""
草屯商工島 × 課程 TA Bot：把 Discord 動態整理成快照，每分鐘推送到網站的 /api/feed。

用法（discord.py 2.x）：
  1. 把這個檔案放進 TA Bot 專案，在 bot 啟動時：
         await bot.load_extension("island_feed")
  2. 設定環境變數：
         ISLAND_FEED_URL   = https://你的網域/api/feed
         ISLAND_FEED_TOKEN = 與 Vercel 的 FEED_TOKEN 相同
  3. Developer Portal 需開啟 MESSAGE CONTENT INTENT（要顯示訊息摘要才需要）。
  4. 依你們伺服器的頻道名稱修改 CHANNEL_DEPT。

隱私：只送暱稱與 60 字內的訊息摘要；ANONYMIZE = True 時暱稱換成「機械科同學」。
"""
import os, re, time, collections
import aiohttp
import discord
from discord.ext import commands, tasks

FEED_URL = os.environ.get("ISLAND_FEED_URL", "")
FEED_TOKEN = os.environ.get("ISLAND_FEED_TOKEN", "")
ANONYMIZE = False

# 頻道名稱（或頻道 ID 字串）→ 小島 id
CHANNEL_DEPT = {
    "機械科": "mech", "配管科": "pipe", "資料處理科": "data", "資處科": "data",
    "會計事務科": "acct", "會計科": "acct", "商業經營科": "biz", "商經科": "biz",
    "應用英語科": "eng", "應英科": "eng", "電腦繪圖科": "cad", "進修部": "night",
    "綜合職能科": "life", "體育班": "sport",
    "證照捷報": "honor", "活動公告": "plaza", "公告": "plaza",
    "課程問答": "discord", "閒聊": "discord", "打卡": "discord",
}
DEPT_NAME = {"mech": "機械科", "pipe": "配管科", "data": "資料處理科", "acct": "會計事務科", "biz": "商業經營科",
             "eng": "應用英語科", "cad": "電腦繪圖科", "night": "進修部", "life": "綜合職能科", "sport": "體育班"}
# 在 #證照捷報 打「機械科 電腦數值控制車床 丙級」或「通過 會計事務－人工記帳 丙級」
CERT_RE = re.compile(r"(?:(?P<dept>機械科|配管科|資料處理科|資處科|會計事務科|會計科|商業經營科|商經科|應用英語科|應英科|電腦繪圖科|進修部|綜合職能科))?\s*(?:通過)?\s*(?P<name>[一-鿿A-Za-z－\- ]{2,20}?)\s*(?P<lv>丙級|乙級|單一級)")
LV = {"丙級": "丙", "乙級": "乙", "單一級": "單"}
SHORT = {"資處科": "資料處理科", "會計科": "會計事務科", "商經科": "商業經營科", "應英科": "應用英語科"}


class IslandFeed(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.hourly = collections.defaultdict(lambda: collections.deque([0] * 24, maxlen=24))
        self.hour_mark = int(time.time() // 3600)
        self.recent_authors = collections.defaultdict(dict)   # dept -> {user_id: last_ts}
        self.events = collections.deque(maxlen=80)
        self.certs = collections.defaultdict(lambda: collections.Counter())
        self.push.start()

    def cog_unload(self):
        self.push.cancel()

    def dept_of(self, channel) -> str | None:
        ch = getattr(channel, "parent", None) or channel        # 討論串歸到母頻道
        for key in (str(ch.id), ch.name):
            if key in CHANNEL_DEPT:
                return CHANNEL_DEPT[key]
        for name, dept in CHANNEL_DEPT.items():
            if name in ch.name:
                return dept
        return None

    def roll_hours(self):
        now = int(time.time() // 3600)
        while self.hour_mark < now:
            for dq in self.hourly.values():
                dq.append(0)
            self.hour_mark += 1

    @commands.Cog.listener()
    async def on_message(self, msg: discord.Message):
        if msg.guild is None or (msg.author.bot and msg.author.id != self.bot.user.id):
            return
        dept = self.dept_of(msg.channel)
        if not dept:
            return
        self.roll_hours()
        self.hourly[dept][-1] += 1
        self.recent_authors[dept][msg.author.id] = time.time()
        nick = (DEPT_NAME.get(dept, "同學") + "同學") if ANONYMIZE else msg.author.display_name[:24]
        text = re.sub(r"<[@#!&:]\S+>|https?://\S+", "", msg.clean_content).strip()[:60] or "（分享了附件）"
        ev = {"id": str(msg.id), "ts": int(msg.created_at.timestamp() * 1000), "type": "message", "dept": dept, "user": nick, "text": text}
        if dept == "honor":
            m = CERT_RE.search(msg.content)
            if m:
                d = SHORT.get(m["dept"], m["dept"]) if m["dept"] else None
                target = next((k for k, v in DEPT_NAME.items() if v == d), None) or "honor"
                key = f"{m['name'].strip()}｜{LV[m['lv']]}"
                self.certs[target][key] += 1
                ev.update(type="cert", dept=target if target != "honor" else "honor", text=f"通過 {m['name'].strip()} {m['lv']}！", cert=key)
        self.events.append(ev)

    def activities(self, guild: discord.Guild):
        out = []
        now = discord.utils.utcnow()
        for se in guild.scheduled_events:
            loc = (se.location or "") + " " + (se.channel.name if se.channel else "") + " " + se.name
            dept = next((d for k, d in CHANNEL_DEPT.items() if k in loc), "plaza")
            status = "live" if se.status == discord.EventStatus.active else ("done" if se.end_time and se.end_time < now else "soon")
            out.append({"id": str(se.id), "dept": dept, "title": se.name[:60], "status": status,
                        "start": se.start_time.date().isoformat(), "end": (se.end_time or se.start_time).date().isoformat(),
                        "joined": se.user_count or 0, "capacity": 0})
        return out

    @tasks.loop(seconds=60)
    async def push(self):
        if not FEED_URL or not self.bot.guilds:
            return
        self.roll_hours()
        guild = self.bot.guilds[0]
        try:
            g = await self.bot.fetch_guild(guild.id, with_counts=True)
            online = g.approximate_presence_count or 0
        except discord.HTTPException:
            online = 0
        cutoff = time.time() - 15 * 60
        channels = {}
        for dept in set(CHANNEL_DEPT.values()):
            hourly = list(self.hourly[dept])
            active = sum(1 for ts in self.recent_authors[dept].values() if ts > cutoff)
            channels[dept] = {"hourly": hourly, "messages24h": sum(hourly), "active": active}
        payload = {"online": online, "channels": channels, "events": list(self.events),
                   "activities": self.activities(guild), "certs": {k: dict(v) for k, v in self.certs.items()}}
        async with aiohttp.ClientSession() as s:
            async with s.post(FEED_URL, json=payload, headers={"Authorization": f"Bearer {FEED_TOKEN}"}, timeout=aiohttp.ClientTimeout(total=15)) as r:
                if r.status != 200:
                    print("[island_feed] push failed", r.status, await r.text())

    @push.before_loop
    async def before(self):
        await self.bot.wait_until_ready()


async def setup(bot: commands.Bot):
    await bot.add_cog(IslandFeed(bot))
