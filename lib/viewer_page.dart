import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'db.dart';
import 'edit_page.dart';

class ViewerPage extends StatefulWidget {
  final Song song;

  const ViewerPage({
    super.key,
    required this.song,
  });

  @override
  State<ViewerPage> createState() => _ViewerPageState();
}

class _ViewerPageState extends State<ViewerPage> {
  late Song _song;
  late final PageController _pageController;
  final Map<int, TransformationController> _transformControllers = {};

  int _currentPage = 0;
  bool _showTopBar = true;
  bool _fitWidth = false;
  bool _isZoomed = false;
  bool _hasChanges = false;

  @override
  void initState() {
    super.initState();
    _song = widget.song;
    _pageController = PageController();
    _enterImmersiveMode();
  }

  @override
  void dispose() {
    _exitImmersiveMode();
    _pageController.dispose();
    for (final controller in _transformControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _enterImmersiveMode() async {
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  Future<void> _exitImmersiveMode() async {
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  }

  TransformationController _controllerForPage(int index) {
    return _transformControllers.putIfAbsent(index, () {
      final controller = TransformationController();
      controller.addListener(() {
        if (!mounted || index != _currentPage) return;
        final zoomed = controller.value.getMaxScaleOnAxis() > 1.05;
        if (zoomed != _isZoomed) {
          setState(() {
            _isZoomed = zoomed;
          });
        }
      });
      return controller;
    });
  }

  void _resetZoomForPage(int index) {
    final controller = _transformControllers[index];
    if (controller != null && controller.value != Matrix4.identity()) {
      controller.value = Matrix4.identity();
    }
  }

  void _resetAllZooms() {
    for (final controller in _transformControllers.values) {
      if (controller.value != Matrix4.identity()) {
        controller.value = Matrix4.identity();
      }
    }
    if (_isZoomed) {
      setState(() {
        _isZoomed = false;
      });
    }
  }

  void _toggleTopBar() {
    setState(() {
      _showTopBar = !_showTopBar;
    });
  }

  void _toggleFitMode() {
    _resetAllZooms();
    setState(() {
      _fitWidth = !_fitWidth;
    });
  }

  void _goToPage(int targetPage) {
    if (targetPage < 0 || targetPage >= _song.pageCount) {
      return;
    }
    _resetZoomForPage(_currentPage);
    _pageController.animateToPage(
      targetPage,
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeInOut,
    );
  }

  Future<void> _openEdit() async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => EditPage(song: _song),
      ),
    );

    if (!mounted) return;
    await _enterImmersiveMode();
    if (!mounted) return;

    if (changed == true) {
      _hasChanges = true;
      final songId = _song.id;
      if (songId == null) {
        Navigator.of(context).pop(true);
        return;
      }

      final updated = await ChordDb.instance.getSongById(songId);
      if (!mounted) return;

      if (updated == null) {
        Navigator.of(context).pop(true);
        return;
      }

      for (final controller in _transformControllers.values) {
        controller.dispose();
      }
      _transformControllers.clear();

      final maxIndex = updated.pageCount > 0 ? updated.pageCount - 1 : 0;
      final nextPage = _currentPage.clamp(0, maxIndex);

      setState(() {
        _song = updated;
        _currentPage = nextPage;
        _isZoomed = false;
      });

      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _pageController.hasClients) {
          _pageController.jumpToPage(nextPage);
        }
      });
    }
  }

  void _closeViewer() {
    Navigator.of(context).pop(_hasChanges);
  }

  @override
  Widget build(BuildContext context) {
    final hasMultiplePages = _song.pageCount > 1;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          _closeViewer();
        }
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Column(
          children: [
            // แถบด้านบน (ซ่อน/แสดงเมื่อแตะจอ) — วางเหนือพื้นที่รูปเพื่อไม่ให้บังส่วนบนของรูป
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              transitionBuilder: (child, animation) => SizeTransition(
                sizeFactor: animation,
                axisAlignment: -1.0,
                child: FadeTransition(opacity: animation, child: child),
              ),
              child: _showTopBar
                  ? Container(
                      key: const ValueKey('viewer_top_bar'),
                      color: const Color.fromRGBO(0, 0, 0, 0.9),
                      child: SafeArea(
                        bottom: false,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 6,
                          ),
                          child: Row(
                            children: [
                              IconButton(
                                tooltip: 'กลับหน้ารายชื่อเพลง',
                                onPressed: _closeViewer,
                                icon: const Icon(
                                  Icons.arrow_back,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  _song.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              TextButton.icon(
                                onPressed: _toggleFitMode,
                                style: TextButton.styleFrom(
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 10,
                                  ),
                                ),
                                icon: Icon(
                                  _fitWidth
                                      ? Icons.view_day_outlined
                                      : Icons.fit_screen_outlined,
                                  size: 20,
                                ),
                                label: Text(
                                  _fitWidth ? 'เต็มความกว้าง' : 'พอดีจอ',
                                ),
                              ),
                              const SizedBox(width: 4),
                              TextButton.icon(
                                onPressed: _openEdit,
                                style: TextButton.styleFrom(
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 10,
                                  ),
                                ),
                                icon: const Icon(Icons.edit_outlined, size: 20),
                                label: const Text('แก้ไข'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    )
                  : const SizedBox.shrink(key: ValueKey('viewer_top_bar_hidden')),
            ),

            // พื้นที่แสดงรูปคอร์ด + ปุ่มกลับมุมซ้ายบน (เมื่อซ่อนแถบบน) + แถบนำทางด้านล่าง
            Expanded(
              child: Stack(
                children: [
                  Positioned.fill(
                    child: GestureDetector(
                      behavior: HitTestBehavior.translucent,
                      onTap: _toggleTopBar,
                      child: _song.pageCount == 0
                          ? _buildMissingPagesPlaceholder()
                          : PageView.builder(
                              controller: _pageController,
                              physics: _isZoomed
                                  ? const NeverScrollableScrollPhysics()
                                  : const PageScrollPhysics(),
                              itemCount: _song.pageCount,
                              onPageChanged: (index) {
                                _resetZoomForPage(_currentPage);
                                setState(() {
                                  _currentPage = index;
                                  _isZoomed = false;
                                });
                              },
                              itemBuilder: (context, index) {
                                final fileName = _song.pageFiles[index];
                                return _buildPageContent(
                                  index,
                                  fileName,
                                  hasMultiplePages: hasMultiplePages,
                                );
                              },
                            ),
                    ),
                  ),

                  // ปุ่มกลับวงกลมเล็กๆ โปร่งแสงมุมซ้ายบน เมื่อซ่อนแถบด้านบน
                  Positioned(
                    top: 0,
                    left: 0,
                    child: IgnorePointer(
                      ignoring: _showTopBar,
                      child: AnimatedOpacity(
                        opacity: _showTopBar ? 0.0 : 1.0,
                        duration: const Duration(milliseconds: 200),
                        child: SafeArea(
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Material(
                              color: const Color.fromRGBO(0, 0, 0, 0.55),
                              shape: const CircleBorder(),
                              clipBehavior: Clip.antiAlias,
                              child: InkWell(
                                onTap: _closeViewer,
                                customBorder: const CircleBorder(),
                                child: const Padding(
                                  padding: EdgeInsets.all(10),
                                  child: Icon(
                                    Icons.arrow_back,
                                    color: Colors.white,
                                    size: 22,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),

                  // แถบปุ่มนำทางด้านล่าง (แสดงตลอดเวลาเมื่อเพลงมีหลายหน้า)
                  if (hasMultiplePages)
                    Positioned(
                      left: 16,
                      right: 16,
                      bottom: 0,
                      child: SafeArea(
                        top: false,
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: Center(
                            child: _BottomPageNavBar(
                              currentPage: _currentPage,
                              totalPages: _song.pageCount,
                              onPrevious: _currentPage > 0
                                  ? () => _goToPage(_currentPage - 1)
                                  : null,
                              onNext: _currentPage < _song.pageCount - 1
                                  ? () => _goToPage(_currentPage + 1)
                                  : null,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPageContent(
    int index,
    String fileName, {
    required bool hasMultiplePages,
  }) {
    final imageFile = ChordDb.instance.getImageFile(fileName);
    final controller = _controllerForPage(index);
    final bottomInset = hasMultiplePages ? 84.0 : 0.0;

    return LayoutBuilder(
      builder: (context, constraints) {
    final safeMinHeight =
        (constraints.maxHeight - bottomInset) < 0 ? 0.0 : constraints.maxHeight - bottomInset;

        final imageWidget = Image.file(
          imageFile,
          width: _fitWidth ? constraints.maxWidth : null,
          fit: _fitWidth ? BoxFit.fitWidth : BoxFit.contain,
          errorBuilder: (_, __, ___) => _buildImageError(fileName),
        );

        return InteractiveViewer(
          transformationController: controller,
          minScale: 1.0,
          maxScale: 5.0,
          child: SizedBox(
            width: constraints.maxWidth,
            height: constraints.maxHeight,
            child: _fitWidth
                ? SingleChildScrollView(
                    padding: EdgeInsets.only(bottom: bottomInset),
                    physics: _isZoomed
                        ? const NeverScrollableScrollPhysics()
                        : const BouncingScrollPhysics(),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        minHeight: safeMinHeight,
                      ),
                      child: Align(
                        alignment: Alignment.topCenter,
                        child: imageWidget,
                      ),
                    ),
                  )
                : Padding(
                    padding: EdgeInsets.only(bottom: bottomInset),
                    child: Center(child: imageWidget),
                  ),
          ),
        );
      },
    );
  }

  Widget _buildImageError(String fileName) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.broken_image_outlined,
            color: Colors.white54,
            size: 64,
          ),
          const SizedBox(height: 12),
          const Text(
            'ไม่พบไฟล์รูปคอร์ด',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            fileName,
            style: const TextStyle(color: Colors.white54, fontSize: 13),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildMissingPagesPlaceholder() {
    return const Center(
      child: Text(
        'ไม่มีรูปคอร์ดในเพลงนี้',
        style: TextStyle(color: Colors.white70, fontSize: 18),
      ),
    );
  }
}

class _BottomPageNavBar extends StatelessWidget {
  final int currentPage;
  final int totalPages;
  final VoidCallback? onPrevious;
  final VoidCallback? onNext;

  const _BottomPageNavBar({
    required this.currentPage,
    required this.totalPages,
    required this.onPrevious,
    required this.onNext,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color.fromRGBO(0, 0, 0, 0.72),
        borderRadius: BorderRadius.circular(36),
        border: Border.all(
          color: const Color.fromRGBO(255, 255, 255, 0.16),
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _NavButton(
            label: '‹ ก่อนหน้า',
            enabled: onPrevious != null,
            onPressed: onPrevious,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Text(
              '${currentPage + 1} / $totalPages',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 17,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          _NavButton(
            label: 'ถัดไป ›',
            enabled: onNext != null,
            onPressed: onNext,
          ),
        ],
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  final String label;
  final bool enabled;
  final VoidCallback? onPressed;

  const _NavButton({
    required this.label,
    required this.enabled,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(28),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(28),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          child: Text(
            label,
            style: TextStyle(
              color: enabled ? Colors.white : Colors.white38,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}
