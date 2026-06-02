# MCP сервер для Mi Bedside Lamp 2

Позволяет Claude управлять лампой Xiaomi Mi Bedside Lamp 2 по Wi-Fi.

## Установка

```bash
cd mcp-mi-lamp
pip install -r requirements.txt
```

## Получить токен лампы

Лампа должна быть подключена к Wi-Fi и привязана к Mi Home.

### Способ 1 — через python-miio
```bash
# Сначала узнай IP лампы в роутере (или Mi Home)
pip install python-miio
miiocli discover
```

### Способ 2 — через miiocli (если уже знаешь IP)
```bash
miiocli device --ip 192.168.1.XXX --token 00000000000000000000000000000000 info
```

> Токен можно достать через приложение [MiHome на Android](https://github.com/PiotrMachowski/Xiaomi-cloud-tokens-extractor) или утилиту `miio-provision`.

## Настройка в Claude Code

Добавь в `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "mi-lamp": {
      "command": "python3",
      "args": ["/path/to/mcp-mi-lamp/server.py"],
      "env": {
        "MI_LAMP_IP": "192.168.1.XXX",
        "MI_LAMP_TOKEN": "твой_32_символьный_токен"
      }
    }
  }
}
```

## Инструменты Claude

После подключения Claude сможет:

| Инструмент | Что делает |
|---|---|
| `lamp_status` | Узнать текущее состояние лампы |
| `lamp_power` | Включить / выключить |
| `lamp_brightness` | Яркость 1–100% |
| `lamp_color_temp` | Цветовая температура 1700–6500K |
| `lamp_color` | Цвет RGB |
