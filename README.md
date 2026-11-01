# 페이퍼 수익률

국장(워뇨띠 카피)과 폴리마켓 페이퍼 트레이딩 수익률을 보여주는 정적 페이지입니다. 금액과 수익률은 `data/`의 CSV·JSON만 사용합니다.

Vercel에 이 저장소를 연결하면 빌드 설정 없이 `index.html`이 배포됩니다.

로컬에서 보려면 정적 서버가 필요합니다. 파일을 직접 열면 브라우저가 `data/` 읽기를 막습니다.

```bash
python3 -m http.server 4173
```

브라우저에서 http://localhost:4173 을 엽니다.

차트는 Chart.js(MIT)입니다. 글꼴 Pretendard는 SIL Open Font License 1.1이며 라이선스 원문은 `vendor/fonts/LICENSE.txt`에 있습니다.
