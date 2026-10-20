"""Manufacturer facts, original summaries, and intentionally illustrative USD prices.

Image provenance and the complete source list: frontend/public/products/hardware/SOURCES.md.
Sample reviews are fictional fixtures, never customer testimonials.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class CatalogProduct:
    category: str
    name: str
    description: str
    price: str
    stock: int
    image: str
    source: str
    featured: bool = False


CATALOG = [
    CatalogProduct(
        "Audio",
        "Sony WH-1000XM5",
        "Wireless over-ear headphones with active noise cancellation, 30 mm drivers, "
        "and up to 30 hours of listening with noise cancellation enabled. Black finish; "
        "USB-C charging and a 3.5 mm wired connection.",
        "299.99",
        24,
        "sony-wh1000xm5.png",
        "https://electronics.sony.com/audio/headphones/headband/p/wh1000xm5-b",
        True,
    ),
    CatalogProduct(
        "Workspace",
        "Keychron V1 Max",
        "75% ANSI mechanical keyboard with a rotary knob, gasket-mounted plastic case, "
        "hot-swappable Gateron Jupiter Red switches, and double-shot PBT keycaps. "
        "Connect over 2.4 GHz, Bluetooth, or USB-C; supports QMK remapping.",
        "99.00",
        18,
        "keychron-v1-max.jpg",
        "https://www.keychron.com/products/keychron-v1-max-qmk-via-wireless-custom-mechanical-keyboard",
        True,
    ),
    CatalogProduct(
        "Audio",
        "JBL Flip 6",
        "Portable Bluetooth speaker with a two-way driver system, IP67 water and dust "
        "resistance, and up to 12 hours of playback. USB-C charging and PartyBoost pairing. "
        "Black finish; rated battery life depends on volume and content.",
        "99.95",
        32,
        "jbl-flip6.png",
        "https://www.jbl.com/FLIP-6-.html",
        True,
    ),
    CatalogProduct(
        "Workspace",
        "Dell G2724D",
        "27-inch Fast IPS gaming monitor with 2560 × 1440 resolution. Up to 165 Hz over "
        "DisplayPort or 144 Hz over HDMI, with an adjustable stand and adaptive-sync support. "
        "Refresh-rate limits depend on the connection and source device.",
        "249.99",
        7,
        "dell-g2724d.png",
        "https://www.dell.com/en-us/shop/dell-27-gaming-monitor-g2724d/apd/210-bhxc/monitors-monitor-accessories",
        True,
    ),
    CatalogProduct(
        "Components",
        "Samsung 990 PRO 1TB",
        "1 TB M.2 2280 NVMe SSD using PCIe 4.0 ×4. Rated sequential reads up to "
        "7,450 MB/s and writes up to 6,900 MB/s. Standard model without a heatsink; "
        "performance depends on system configuration and workload.",
        "119.99",
        15,
        "samsung-990-pro.png",
        "https://www.samsung.com/ie/memory-storage/nvme-ssd/990-pro-1tb-nvme-pcie-gen-4-mz-v9p1t0bw/",
    ),
    CatalogProduct(
        "Workspace",
        "Logitech MX Master 3S",
        "Right-handed ergonomic Bluetooth mouse with an adjustable sensor up to 8,000 DPI, "
        "quiet main buttons, and MagSpeed electromagnetic scrolling. Pairs with up to "
        "three devices and recharges over USB-C. Graphite Bluetooth edition.",
        "89.99",
        40,
        "logitech-mx-master-3s.png",
        "https://www.logitech.com/en-us/shop/p/mx-master-3s.910-006556",
    ),
    CatalogProduct(
        "Components",
        "AMD Ryzen 7 7800X3D",
        "Socket AM5 desktop processor with 8 Zen 4 cores, 16 threads, and 96 MB of L3 "
        "cache using AMD 3D V-Cache. Boost clock up to 5.0 GHz and 120 W default TDP. "
        "Requires a compatible motherboard, DDR5 memory, and a separately purchased cooler.",
        "349.00",
        3,
        "amd-7800x3d.jpg",
        "https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-7-7800x3d.html",
    ),
    CatalogProduct(
        "Components",
        "NVIDIA GeForce RTX 4070 SUPER",
        "Ada Lovelace desktop graphics card with 7,168 CUDA cores and 12 GB GDDR6X memory "
        "on a 192-bit bus. Supports ray tracing and DLSS 3. Founders Edition pictured; "
        "check case dimensions, power supply, and connectors before choosing a card.",
        "599.00",
        0,
        "nvidia-rtx4070super.jpg",
        "https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4070-family/",
    ),
]

LEGACY_CATALOG = {
    "Studio Wireless": "headphones",
    "Type 75": "keyboard",
    "Pocket Speaker": "speaker",
    "Focus Display 27": "monitor",
    "Orbit Watch": "watch",
    "Arc Mouse": "mouse",
    "Studio Wireless · Sand": "headphones-sand",
    "Pocket Speaker · Moss": "speaker-moss",
}

# Fictional review fixtures; excluded from customer rating averages.
DEMO_REVIEWS = {
    "Sony WH-1000XM5": [
        (
            5,
            "The noise cancellation is useful on a commute. The case takes up more bag "
            "space than I expected.",
        ),
        (
            4,
            "Comfortable for a long listening session. I would prefer a folding headband "
            "for travel.",
        ),
    ],
    "Keychron V1 Max": [
        (5, "The compact layout leaves room for a mouse. Remapping the knob was straightforward."),
        (
            4,
            "A good layout for my desk. The case is plastic, so check that if you prefer "
            "a heavier keyboard.",
        ),
    ],
    "JBL Flip 6": [
        (4, "Easy to carry between rooms. A microphone for calls would make it more useful to me."),
        (
            5,
            "The physical controls are easy to find. USB-C charging keeps the cable "
            "situation simple.",
        ),
    ],
    "Dell G2724D": [
        (
            5,
            "The adjustable stand made it easy to get the height right. DisplayPort is "
            "the better choice for the maximum refresh rate.",
        ),
        (4, "The QHD resolution suits a desk setup. It does not replace a USB-C docking monitor."),
    ],
    "Samsung 990 PRO 1TB": [
        (
            5,
            "The M.2 format kept the build tidy. Check your board's slot and heatsink "
            "clearance before installing.",
        ),
        (
            4,
            "One terabyte is fine for my current games, though I would consider a larger "
            "capacity for a big library.",
        ),
    ],
    "Logitech MX Master 3S": [
        (5, "The scroll wheel is handy for long documents. The right-handed shape suits my grip."),
        (4, "Quiet clicks are useful in a shared office. It is larger than a travel mouse."),
    ],
    "AMD Ryzen 7 7800X3D": [
        (5, "A component worth considering for an AM5 gaming build. Budget for a separate cooler."),
        (
            4,
            "Check the motherboard BIOS before assembly. This is not an upgrade for an AM4 socket.",
        ),
    ],
    "NVIDIA GeForce RTX 4070 SUPER": [
        (
            4,
            "Check the exact card dimensions before ordering. Different manufacturers use "
            "different coolers.",
        ),
        (
            5,
            "The 12 GB memory specification was important for comparing this with other "
            "cards on my shortlist.",
        ),
    ],
}
