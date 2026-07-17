; 不展开详情视图，避免前半段空白框框
!macro customHeader
!macroend

; 安装初始化（.onInit 函数内）：关闭运行中的进程
!macro customInit
  nsExec::ExecToLog 'taskkill /F /IM "${APP_PRODUCT_FILENAME}.exe"'
  Pop $0
!macroend

; 安装阶段（Section 内）：输出已安装文件列表
; Nsis7z 解压过程本身不输出文件名（固有限制），
; 这里在解压完成后通过遍历 $INSTDIR 把已安装的文件列表输出到详情框。
!macro customInstall
  SetDetailsPrint both
  DetailPrint "============================================================"
  DetailPrint "  ${APP_PRODUCT_FILENAME} ${VERSION} 安装完成"
  DetailPrint "============================================================"
  DetailPrint "安装目录: $INSTDIR"
  DetailPrint ""
  DetailPrint "已安装文件列表:"

  Push $0
  Push $1
  Push $2

  ; 顶层目录
  FindFirst $0 $1 "$INSTDIR\*.*"
  loop_top:
    StrCmp $1 "" done_top
    StrCmp $1 "." next_top
    StrCmp $1 ".." next_top
    StrCpy $2 "$INSTDIR\$1"
    DetailPrint "  $2"
    next_top:
      FindNext $0 $1
      Goto loop_top
  done_top:
    FindClose $0

  ; resources 子目录（electron 应用主体）
  FindFirst $0 $1 "$INSTDIR\resources\*.*"
  loop_res:
    StrCmp $1 "" done_res
    StrCmp $1 "." next_res
    StrCmp $1 ".." next_res
    StrCpy $2 "$INSTDIR\resources\$1"
    DetailPrint "  $2"
    next_res:
      FindNext $0 $1
      Goto loop_res
  done_res:
    FindClose $0

  ; locales 子目录（语言包）
  FindFirst $0 $1 "$INSTDIR\locales\*.*"
  loop_loc:
    StrCmp $1 "" done_loc
    StrCmp $1 "." next_loc
    StrCmp $1 ".." next_loc
    StrCpy $2 "$INSTDIR\locales\$1"
    DetailPrint "  $2"
    next_loc:
      FindNext $0 $1
      Goto loop_loc
  done_loc:
    FindClose $0

  Pop $2
  Pop $1
  Pop $0

  DetailPrint "============================================================"
  SetAutoClose false
!macroend
