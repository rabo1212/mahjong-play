'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import TileComponent from '@/components/game/TileComponent';
import { kindToDisplayId } from '@/lib/tile-utils';

/** 패 그룹 렌더링 */
function TileRow({ kinds, size = 'sm' }: { kinds: number[]; size?: 'xs' | 'sm' }) {
  return (
    <div className="flex gap-0.5 flex-wrap">
      {kinds.map((kind, i) => (
        <TileComponent key={`${kind}-${i}`} tileId={kindToDisplayId(kind)} size={size} />
      ))}
    </div>
  );
}

const SECTIONS = [
  { id: 'tiles', label: '패 종류' },
  { id: 'flow', label: '게임 흐름' },
  { id: 'win', label: '화료' },
  { id: 'scoring', label: '점수' },
  { id: 'glossary', label: '용어' },
];

const GLOSSARY = [
  { term: '화료 (和了)', desc: '패를 완성하여 이기는 것' },
  { term: '텐파이 (聽牌)', desc: '1장만 더 오면 화료할 수 있는 상태' },
  { term: '향청수 (向聴数)', desc: '텐파이까지 필요한 교환 수 (0=텐파이)' },
  { term: '쯔모 (自摸)', desc: '패산에서 직접 뽑아 화료' },
  { term: '론 (榮)', desc: '상대가 버린 패로 화료' },
  { term: '순자 (順子)', desc: '같은 수트의 연속 3장 (예: 1-2-3)' },
  { term: '커쯔 (刻子)', desc: '같은 패 3장 (예: 1-1-1)' },
  { term: '깡쯔 (槓子)', desc: '같은 패 4장 (예: 1-1-1-1)' },
  { term: '작두 (雀頭)', desc: '같은 패 2장 쌍 (머리)' },
  { term: '부로 (副露)', desc: '상대 버림패를 가져와 면자 공개' },
  { term: '치 (吃)', desc: '왼쪽 상대 버림패로 순자 완성' },
  { term: '펑 (碰)', desc: '누구든 버림패로 커쯔 완성' },
  { term: '깡 (槓)', desc: '같은 패 4장으로 깡쯔 선언' },
  { term: '문전 (門前)', desc: '부로 없이 손패만으로 플레이' },
  { term: '역 (役)', desc: '점수를 받을 수 있는 특정 패 조합/조건' },
  { term: '패산 (牌山)', desc: '뽑을 패가 쌓여 있는 벽' },
];

export default function RulesPage() {
  const router = useRouter();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="min-h-screen flex flex-col items-center bg-base px-4 py-8">
      <h1
        className="text-3xl sm:text-5xl font-display font-bold text-gold mb-1"
        style={{ textShadow: '0 0 30px rgba(212,168,75,0.3)' }}
      >
        MahjongPlay
      </h1>
      <p className="text-sm text-text-secondary mb-5">입문 가이드</p>

      {/* 목차 칩 */}
      <div className="flex flex-wrap gap-1.5 mb-6 justify-center max-w-md">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className="px-2.5 py-1 rounded-full text-[11px] font-display cursor-pointer
              transition-colors border bg-panel text-text-muted border-white/5
              hover:border-gold/30 hover:text-gold"
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* ===== 섹션 1: 패의 종류 ===== */}
        <div
          ref={el => { sectionRefs.current['tiles'] = el; }}
          className="bg-panel rounded-2xl border border-white/5 shadow-panel p-4 sm:p-6"
        >
          <h2 className="font-display font-bold text-base text-gold mb-3">
            패의 종류
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-4">
            마작은 총 <span className="text-text-primary font-semibold">144장</span>의 패를 사용합니다.
            크게 수패, 자패(풍패+삼원패), 화패로 나뉩니다.
          </p>

          {/* 만수 */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-tile-wan">만수 (萬子)</span>
              <span className="text-[10px] text-text-muted">각 4장 = 36장</span>
            </div>
            <TileRow kinds={[11, 12, 13, 14, 15, 16, 17, 18, 19]} />
          </div>

          {/* 통수 */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-tile-pin">통수 (筒子)</span>
              <span className="text-[10px] text-text-muted">각 4장 = 36장</span>
            </div>
            <TileRow kinds={[21, 22, 23, 24, 25, 26, 27, 28, 29]} />
          </div>

          {/* 삭수 */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-tile-sou">삭수 (索子)</span>
              <span className="text-[10px] text-text-muted">각 4장 = 36장</span>
            </div>
            <TileRow kinds={[31, 32, 33, 34, 35, 36, 37, 38, 39]} />
          </div>

          {/* 풍패 */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-text-primary">풍패 (風牌)</span>
              <span className="text-[10px] text-text-muted">각 4장 = 16장</span>
            </div>
            <div className="flex gap-0.5">
              {[41, 42, 43, 44].map(k => (
                <div key={k} className="flex flex-col items-center gap-0.5">
                  <TileComponent tileId={kindToDisplayId(k)} size="sm" />
                  <span className="text-[9px] text-text-muted">
                    {['동', '남', '서', '북'][k - 41]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 삼원패 */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-text-primary">삼원패 (三元牌)</span>
              <span className="text-[10px] text-text-muted">각 4장 = 12장</span>
            </div>
            <div className="flex gap-0.5">
              {[51, 52, 53].map(k => (
                <div key={k} className="flex flex-col items-center gap-0.5">
                  <TileComponent tileId={kindToDisplayId(k)} size="sm" />
                  <span className="text-[9px] text-text-muted">
                    {['중', '발', '백'][k - 51]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 화패 */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-action-success">화패 (花牌)</span>
              <span className="text-[10px] text-text-muted">각 1장 = 8장</span>
            </div>
            <TileRow kinds={[61, 62, 63, 64, 65, 66, 67, 68]} size="xs" />
            <p className="text-[10px] text-text-muted mt-1">
              뽑으면 자동으로 공개하고 1장당 1점. 새 패를 보충합니다.
            </p>
          </div>
        </div>

        {/* ===== 섹션 2: 게임 흐름 ===== */}
        <div
          ref={el => { sectionRefs.current['flow'] = el; }}
          className="bg-panel rounded-2xl border border-white/5 shadow-panel p-4 sm:p-6"
        >
          <h2 className="font-display font-bold text-base text-gold mb-3">
            게임 흐름
          </h2>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center
                font-display font-bold text-xs text-gold">1</div>
              <div>
                <p className="text-xs sm:text-sm text-text-primary font-semibold">배패</p>
                <p className="text-[11px] text-text-secondary">
                  144장을 섞어 각 플레이어에게 13장씩 배분합니다.
                  동풍(친)은 14장을 받아 먼저 시작합니다.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center
                font-display font-bold text-xs text-gold">2</div>
              <div>
                <p className="text-xs sm:text-sm text-text-primary font-semibold">뽑기 &rarr; 버리기</p>
                <p className="text-[11px] text-text-secondary">
                  자기 차례에 패산에서 1장을 뽑고, 손패 중 1장을 버립니다.
                  반시계 방향으로 턴이 진행됩니다.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center
                font-display font-bold text-xs text-gold">3</div>
              <div>
                <p className="text-xs sm:text-sm text-text-primary font-semibold">부로 (울기)</p>
                <p className="text-[11px] text-text-secondary">
                  상대가 버린 패를 가져와 면자를 만들 수 있습니다.
                </p>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-display font-bold text-action-blue px-1.5 py-0.5
                      rounded bg-action-blue/10 flex-shrink-0">치</span>
                    <span className="text-[10px] text-text-muted">
                      왼쪽 플레이어의 버림패로 순자(연속 3장) 완성
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-display font-bold text-action-success px-1.5 py-0.5
                      rounded bg-action-success/10 flex-shrink-0">펑</span>
                    <span className="text-[10px] text-text-muted">
                      누구의 버림패든 커쯔(같은 패 3장) 완성
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-display font-bold text-gold px-1.5 py-0.5
                      rounded bg-gold/10 flex-shrink-0">깡</span>
                    <span className="text-[10px] text-text-muted">
                      같은 패 4장을 깡쯔로 선언, 왕패에서 1장 보충
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center
                font-display font-bold text-xs text-gold">4</div>
              <div>
                <p className="text-xs sm:text-sm text-text-primary font-semibold">화료 또는 유국</p>
                <p className="text-[11px] text-text-secondary">
                  누군가 패를 완성하면 화료(승리). 패산이 소진되면 유국(무승부)입니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 섹션 3: 화료 (이기는 법) ===== */}
        <div
          ref={el => { sectionRefs.current['win'] = el; }}
          className="bg-panel rounded-2xl border border-white/5 shadow-panel p-4 sm:p-6"
        >
          <h2 className="font-display font-bold text-base text-gold mb-3">
            화료 (이기는 법)
          </h2>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-3">
            손패 14장을 <span className="text-text-primary font-semibold">4면자 + 1작두</span>로
            완성하면 화료입니다.
          </p>

          {/* 면자 설명 */}
          <div className="space-y-3 mb-4">
            <div className="bg-base/50 rounded-xl p-3">
              <p className="text-[11px] text-text-primary font-semibold mb-1.5">순자 (順子) — 연속 3장</p>
              <TileRow kinds={[11, 12, 13]} size="xs" />
            </div>

            <div className="bg-base/50 rounded-xl p-3">
              <p className="text-[11px] text-text-primary font-semibold mb-1.5">커쯔 (刻子) — 같은 패 3장</p>
              <TileRow kinds={[25, 25, 25]} size="xs" />
            </div>

            <div className="bg-base/50 rounded-xl p-3">
              <p className="text-[11px] text-text-primary font-semibold mb-1.5">깡쯔 (槓子) — 같은 패 4장</p>
              <TileRow kinds={[39, 39, 39, 39]} size="xs" />
            </div>

            <div className="bg-base/50 rounded-xl p-3">
              <p className="text-[11px] text-text-primary font-semibold mb-1.5">작두 (雀頭) — 같은 패 2장 (머리)</p>
              <TileRow kinds={[41, 41]} size="xs" />
            </div>
          </div>

          {/* 화료 예시 */}
          <div className="bg-base/50 rounded-xl p-3 mb-3">
            <p className="text-[11px] text-gold font-display font-bold mb-1.5">화료 예시</p>
            <TileRow kinds={[11, 12, 13, 24, 25, 26, 33, 33, 33, 41, 41, 41, 19, 19]} size="xs" />
            <p className="text-[10px] text-text-muted mt-1">
              순자 + 순자 + 커쯔 + 커쯔 + 작두 = 화료!
            </p>
          </div>

          {/* 쯔모 vs 론 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-base/50 rounded-xl p-3 text-center">
              <p className="text-[11px] text-action-success font-semibold mb-0.5">쯔모 (自摸)</p>
              <p className="text-[10px] text-text-muted">직접 뽑아서 완성</p>
            </div>
            <div className="bg-base/50 rounded-xl p-3 text-center">
              <p className="text-[11px] text-action-blue font-semibold mb-0.5">론 (榮)</p>
              <p className="text-[10px] text-text-muted">상대 버림패로 완성</p>
            </div>
          </div>

          {/* 특수형 */}
          <div className="border-t border-white/5 pt-3">
            <p className="text-[11px] text-text-primary font-semibold mb-2">특수 화료형</p>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-gold font-display">칠대자 (七對子) — 24점</p>
                <p className="text-[10px] text-text-muted mb-1">같은 패 2장씩 7쌍</p>
                <TileRow kinds={[11, 11, 14, 14, 23, 23, 27, 27, 35, 35, 41, 41, 51, 51]} size="xs" />
              </div>
              <div>
                <p className="text-[10px] text-gold font-display">십삼요 (十三幺) — 88점</p>
                <p className="text-[10px] text-text-muted mb-1">13종 요구패 + 1장 중복</p>
                <TileRow kinds={[11, 19, 21, 29, 31, 39, 41, 42, 43, 44, 51, 52, 53, 11]} size="xs" />
              </div>
            </div>
          </div>
        </div>

        {/* ===== 섹션 4: 점수 계산 기초 ===== */}
        <div
          ref={el => { sectionRefs.current['scoring'] = el; }}
          className="bg-panel rounded-2xl border border-white/5 shadow-panel p-4 sm:p-6"
        >
          <h2 className="font-display font-bold text-base text-gold mb-3">
            점수 계산
          </h2>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-3">
            MCR(국표마작) 방식으로, 완성한 패에 포함된
            <span className="text-text-primary font-semibold"> 역(役)</span>의 점수를 합산합니다.
          </p>

          <div className="bg-base/50 rounded-xl p-3 mb-3">
            <p className="text-[11px] text-action-danger font-semibold mb-1">
              최소 8점 이상이어야 화료 가능!
            </p>
            <p className="text-[10px] text-text-muted">
              초보자 모드에서는 이 제한이 해제됩니다.
            </p>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-secondary">대삼원 (大三元)</span>
              <span className="text-action-danger font-display font-bold">88점</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-secondary">청일색 (清一色)</span>
              <span className="text-gold font-display font-bold">24점</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-secondary">대대화 (碰碰和)</span>
              <span className="text-action-blue font-display font-bold">6점</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-secondary">자모 (自摸)</span>
              <span className="text-text-primary font-display font-bold">1점</span>
            </div>
          </div>

          <button
            onClick={() => router.push('/yaku')}
            className="w-full py-2 rounded-lg text-xs font-display
              bg-gold/10 text-gold border border-gold/20
              hover:bg-gold/20 transition-colors cursor-pointer"
          >
            전체 역 목록 보기 &rarr;
          </button>
        </div>

        {/* ===== 섹션 5: 용어 사전 ===== */}
        <div
          ref={el => { sectionRefs.current['glossary'] = el; }}
          className="bg-panel rounded-2xl border border-white/5 shadow-panel p-4 sm:p-6"
        >
          <h2 className="font-display font-bold text-base text-gold mb-3">
            용어 사전
          </h2>

          <div className="space-y-2">
            {GLOSSARY.map(g => (
              <div key={g.term} className="flex gap-2">
                <span className="text-[11px] text-text-primary font-semibold flex-shrink-0 w-[100px] sm:w-[120px]">
                  {g.term}
                </span>
                <span className="text-[11px] text-text-muted">
                  {g.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 정보 */}
      <p className="text-[10px] text-text-muted mt-6 text-center">
        MCR (국표마작) 기준 · 4명 플레이 · 144장 · 25가지 역
      </p>

      {/* 하단 링크 */}
      <div className="flex gap-4 mt-4">
        <button
          onClick={() => router.push('/')}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          &larr; 홈으로
        </button>
        <button
          onClick={() => router.push('/yaku')}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          역 사전
        </button>
        <button
          onClick={() => router.push('/lobby')}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          로비로
        </button>
      </div>
    </main>
  );
}
