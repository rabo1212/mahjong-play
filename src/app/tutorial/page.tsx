'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import TileComponent from '@/components/game/TileComponent';
import { kindToDisplayId } from '@/lib/tile-utils';
import { isTenpai, getWaitingTiles } from '@/engine/win-detector';
import { getTileDisplayInfo } from '@/lib/tile-display';
import { TILE_LABELS } from '@/lib/constants';
import {
  TUTORIAL_STEPS,
  TILE_GROUPS,
  MELD_EXAMPLES,
  QUIZ_QUESTIONS,
  DISCARD_HAND_KINDS,
  DISCARD_CORRECT_KIND,
  DISCARD_HINT,
  CALL_HAND_KINDS,
  CALL_DISCARD_KIND,
  CALL_HINT,
  WIN_HAND_KINDS,
  WIN_TILE_KIND,
  WIN_HINT,
} from '@/lib/tutorial-steps';

export default function TutorialPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const totalSteps = TUTORIAL_STEPS.length;
  const current = TUTORIAL_STEPS[step];

  const goNext = () => { if (step < totalSteps - 1) setStep(step + 1); };
  const goPrev = () => { if (step > 0) setStep(step - 1); };

  return (
    <main className="min-h-screen bg-base px-4 py-6 flex flex-col items-center">
      {/* 헤더 */}
      <div className="w-full max-w-lg mb-4">
        <button
          onClick={() => router.push('/')}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          &larr; 홈으로
        </button>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-gold mt-2"
          style={{ textShadow: '0 0 20px rgba(212,168,75,0.3)' }}>
          튜토리얼
        </h1>
      </div>

      {/* 진행 바 */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex gap-1.5">
          {TUTORIAL_STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              className={`flex-1 h-1.5 rounded-full transition-colors cursor-pointer ${
                i <= step ? 'bg-gold' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-text-muted">{step + 1} / {totalSteps}</span>
          <span className="text-[10px] text-gold">{current.title}</span>
        </div>
      </div>

      {/* 단계별 콘텐츠 */}
      <div className="w-full max-w-lg flex-1">
        {current.type === 'tiles' && <TilesStep onComplete={goNext} />}
        {current.type === 'melds' && <MeldsStep onComplete={goNext} />}
        {current.type === 'discard' && <DiscardStep onComplete={goNext} />}
        {current.type === 'call' && <CallStep onComplete={goNext} />}
        {current.type === 'win' && <WinStep />}
      </div>

      {/* 네비게이션 */}
      <div className="w-full max-w-lg flex justify-between mt-6 gap-3">
        <button
          onClick={goPrev}
          disabled={step === 0}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer
            bg-panel-light text-text-secondary border border-white/5
            hover:border-white/10 transition-colors disabled:opacity-30"
        >
          이전
        </button>
        {step < totalSteps - 1 ? (
          <button
            onClick={goNext}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer
              bg-gold/20 text-gold border border-gold/30
              hover:bg-gold/30 transition-colors"
          >
            다음
          </button>
        ) : (
          <button
            onClick={() => router.push('/game?difficulty=easy&beginner=true')}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer
              bg-gradient-to-r from-gold-dark via-gold to-gold-light text-text-on-gold
              hover:shadow-gold-glow transition-all"
          >
            게임 시작하기!
          </button>
        )}
      </div>
    </main>
  );
}

// ─── Step 1: 패 종류 ───
function TilesStep({ onComplete }: { onComplete: () => void }) {
  const [selectedKind, setSelectedKind] = useState<number | null>(null);

  const selectedInfo = useMemo(() => {
    if (selectedKind === null) return null;
    return getTileDisplayInfo(selectedKind);
  }, [selectedKind]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-panel rounded-xl border border-white/5 p-4">
        <p className="text-sm text-text-secondary mb-1">마작에는 <span className="text-gold font-semibold">136장</span>의 패가 있습니다.</p>
        <p className="text-xs text-text-muted">5종류로 나뉘며, 각 패는 4장씩 있어요. 터치해보세요!</p>
      </div>

      {TILE_GROUPS.map((group) => (
        <div key={group.label} className="bg-panel/60 rounded-xl border border-white/5 p-4">
          <h3 className={`text-sm font-semibold mb-1 ${group.colorClass}`}>{group.label}</h3>
          <p className="text-[10px] text-text-muted mb-3">{group.description}</p>
          <div className="flex gap-1 flex-wrap">
            {group.kinds.map((kind) => (
              <div
                key={kind}
                onClick={() => setSelectedKind(kind)}
                className="cursor-pointer"
              >
                <TileComponent
                  tileId={kindToDisplayId(kind)}
                  size="sm"
                  highlighted={selectedKind === kind}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 선택된 패 정보 */}
      {selectedInfo && (
        <div className="bg-gold/10 rounded-xl border border-gold/20 p-4 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className={`text-2xl font-tile font-bold ${selectedInfo.colorClass}`}>
              {selectedInfo.mainChar}
            </span>
            {selectedInfo.suitChar && (
              <span className={`text-lg font-tile ${selectedInfo.colorClass}`}>
                {selectedInfo.suitChar}
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary">{TILE_LABELS[selectedKind!] || ''}</p>
        </div>
      )}

      <button
        onClick={onComplete}
        className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer
          bg-gold/15 text-gold border border-gold/25 hover:bg-gold/25 transition-colors"
      >
        다음: 면자 만들기
      </button>
    </div>
  );
}

// ─── Step 2: 면자 ───
function MeldsStep({ onComplete }: { onComplete: () => void }) {
  const [quizIndex, setQuizIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const quizDone = quizIndex >= QUIZ_QUESTIONS.length;

  const handleAnswer = (idx: number) => {
    setSelected(idx);
    setShowResult(true);
  };

  const nextQuiz = () => {
    setQuizIndex(quizIndex + 1);
    setSelected(null);
    setShowResult(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-panel rounded-xl border border-white/5 p-4">
        <p className="text-sm text-text-secondary mb-1">
          마작은 <span className="text-gold font-semibold">면자 4조 + 머리 1조</span>를 만들면 이깁니다.
        </p>
        <p className="text-xs text-text-muted">면자에는 순자와 커쯔 2종류가 있어요.</p>
      </div>

      {/* 면자 예시 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MeldExample label={MELD_EXAMPLES.shuntsu.label} desc={MELD_EXAMPLES.shuntsu.description} kinds={MELD_EXAMPLES.shuntsu.kinds} />
        <MeldExample label={MELD_EXAMPLES.koutsu.label} desc={MELD_EXAMPLES.koutsu.description} kinds={MELD_EXAMPLES.koutsu.kinds} />
        <MeldExample label={MELD_EXAMPLES.pair.label} desc={MELD_EXAMPLES.pair.description} kinds={MELD_EXAMPLES.pair.kinds} />
      </div>

      {/* 완성 예시 */}
      <div className="bg-gold/10 rounded-xl border border-gold/20 p-4">
        <h3 className="text-sm font-semibold text-gold mb-2">{MELD_EXAMPLES.complete.label}</h3>
        <p className="text-[10px] text-text-muted mb-3">{MELD_EXAMPLES.complete.description}</p>
        <div className="flex gap-2 flex-wrap items-center">
          {MELD_EXAMPLES.complete.groups.map((group, gi) => (
            <div key={gi} className="flex gap-0.5">
              {group.map((kind, ki) => (
                <TileComponent key={`${gi}-${ki}`} tileId={kindToDisplayId(kind)} size="sm" />
              ))}
              {gi < MELD_EXAMPLES.complete.groups.length - 1 && (
                <span className="text-text-muted text-xs mx-1">+</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 퀴즈 */}
      {!quizDone ? (
        <div className="bg-panel rounded-xl border border-white/5 p-4">
          <h3 className="text-xs text-text-muted mb-2">퀴즈 {quizIndex + 1}/{QUIZ_QUESTIONS.length}</h3>
          <p className="text-sm text-text-primary mb-3">{QUIZ_QUESTIONS[quizIndex].question}</p>
          <div className="space-y-2">
            {QUIZ_QUESTIONS[quizIndex].options.map((opt, i) => {
              const isCorrect = i === QUIZ_QUESTIONS[quizIndex].correctIndex;
              const isSelected = selected === i;
              let style = 'bg-panel-light border-white/5 hover:border-white/10';
              if (showResult && isSelected && isCorrect) style = 'bg-action-success/15 border-action-success/30';
              if (showResult && isSelected && !isCorrect) style = 'bg-action-danger/15 border-action-danger/30';
              if (showResult && !isSelected && isCorrect) style = 'bg-action-success/10 border-action-success/20';

              return (
                <button
                  key={i}
                  onClick={() => !showResult && handleAnswer(i)}
                  disabled={showResult}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-colors cursor-pointer ${style}`}
                >
                  {opt.kinds.length > 0 && (
                    <div className="flex gap-0.5">
                      {opt.kinds.map((k, ki) => (
                        <TileComponent key={ki} tileId={kindToDisplayId(k)} size="xs" />
                      ))}
                    </div>
                  )}
                  <span className="text-sm text-text-primary">{opt.label}</span>
                </button>
              );
            })}
          </div>
          {showResult && (
            <div className="mt-3 animate-fade-in">
              <p className={`text-xs mb-2 ${selected === QUIZ_QUESTIONS[quizIndex].correctIndex ? 'text-action-success' : 'text-action-danger'}`}>
                {selected === QUIZ_QUESTIONS[quizIndex].correctIndex ? '정답!' : '오답!'}
              </p>
              <p className="text-xs text-text-muted">{QUIZ_QUESTIONS[quizIndex].explanation}</p>
              <button
                onClick={nextQuiz}
                className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer
                  bg-gold/15 text-gold border border-gold/25 hover:bg-gold/25 transition-colors"
              >
                {quizIndex < QUIZ_QUESTIONS.length - 1 ? '다음 문제' : '퀴즈 완료!'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={onComplete}
          className="w-full py-3 rounded-xl text-sm font-semibold cursor-pointer
            bg-gold/15 text-gold border border-gold/25 hover:bg-gold/25 transition-colors"
        >
          다음: 패 버리기 연습
        </button>
      )}
    </div>
  );
}

function MeldExample({ label, desc, kinds }: { label: string; desc: string; kinds: number[] }) {
  return (
    <div className="bg-panel/60 rounded-lg border border-white/5 p-3">
      <h4 className="text-xs font-semibold text-text-primary mb-1">{label}</h4>
      <p className="text-[10px] text-text-muted mb-2">{desc}</p>
      <div className="flex gap-0.5">
        {kinds.map((kind, i) => (
          <TileComponent key={i} tileId={kindToDisplayId(kind)} size="sm" />
        ))}
      </div>
    </div>
  );
}

// ─── Step 3: 버리기 연습 ───
function DiscardStep({ onComplete }: { onComplete: () => void }) {
  const [hand, setHand] = useState<number[]>(DISCARD_HAND_KINDS);
  const [discarded, setDiscarded] = useState(false);
  const [selectedKind, setSelectedKind] = useState<number | null>(null);
  const [wrongAttempt, setWrongAttempt] = useState(false);

  const handIds = useMemo(() => hand.map(kindToDisplayId), [hand]);
  const tenpaiResult = useMemo(() => {
    if (hand.length !== 13) return null;
    if (!isTenpai(hand, 0)) return null;
    return getWaitingTiles(hand, 0);
  }, [hand]);

  const handleDiscard = (kind: number) => {
    if (discarded) return;
    if (kind === DISCARD_CORRECT_KIND) {
      const newHand = [...hand];
      const idx = newHand.indexOf(kind);
      if (idx >= 0) newHand.splice(idx, 1);
      setHand(newHand);
      setDiscarded(true);
      setWrongAttempt(false);
    } else {
      setSelectedKind(kind);
      setWrongAttempt(true);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-panel rounded-xl border border-white/5 p-4">
        <p className="text-sm text-text-secondary mb-1">
          14장에서 <span className="text-gold font-semibold">1장을 버려서</span> 텐파이를 만들어보세요.
        </p>
        <p className="text-xs text-text-muted">텐파이 = 1장만 더 오면 화료할 수 있는 상태!</p>
      </div>

      {/* 손패 */}
      <div className="bg-panel/60 rounded-xl border border-white/5 p-4">
        <h3 className="text-xs text-text-muted mb-3">내 손패 (터치하여 버리기)</h3>
        <div className="flex gap-1 flex-wrap justify-center">
          {hand.map((kind, i) => {
            const isCorrect = kind === DISCARD_CORRECT_KIND;
            return (
              <div
                key={i}
                onClick={() => handleDiscard(kind)}
                className={`cursor-pointer transition-transform ${
                  !discarded && isCorrect ? 'animate-pulse' : ''
                } ${selectedKind === kind && wrongAttempt ? 'scale-95' : 'hover:scale-105'}`}
              >
                <TileComponent
                  tileId={handIds[i]}
                  size="sm"
                  highlighted={!discarded && isCorrect}
                />
              </div>
            );
          })}
        </div>

        {!discarded && (
          <p className="text-[10px] text-action-chi text-center mt-3">{DISCARD_HINT}</p>
        )}

        {wrongAttempt && !discarded && (
          <p className="text-[10px] text-action-danger text-center mt-2 animate-fade-in">
            이 패는 면자의 일부입니다. 다른 패를 골라보세요!
          </p>
        )}
      </div>

      {/* 텐파이 달성 */}
      {discarded && tenpaiResult && (
        <div className="bg-action-success/10 rounded-xl border border-action-success/20 p-4 text-center animate-fade-in">
          <h3 className="text-lg font-display font-bold text-action-success mb-2">텐파이 달성!</h3>
          <p className="text-xs text-text-muted mb-3">이제 아래 패가 오면 화료할 수 있습니다:</p>
          <div className="flex gap-1 justify-center">
            {tenpaiResult.map((kind, i) => {
              return (
                <div key={i} className="text-center">
                  <TileComponent tileId={kindToDisplayId(kind)} size="sm" highlighted />
                  <span className="text-[10px] text-text-muted">{TILE_LABELS[kind] || ''}</span>
                </div>
              );
            })}
          </div>
          <button
            onClick={onComplete}
            className="mt-4 px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer
              bg-gold/15 text-gold border border-gold/25 hover:bg-gold/25 transition-colors"
          >
            다음: 치 해보기
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: 치 연습 ───
function CallStep({ onComplete }: { onComplete: () => void }) {
  const [called, setCalled] = useState(false);
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-panel rounded-xl border border-white/5 p-4">
        <p className="text-sm text-text-secondary mb-1">
          다른 플레이어가 버린 패로 <span className="text-action-chi font-semibold">순자를 완성</span>할 수 있습니다.
        </p>
        <p className="text-xs text-text-muted">이것을 &quot;치 (吃)&quot;라고 합니다. 왼쪽 사람의 버림패만 가능해요.</p>
      </div>

      {/* 상대가 버린 패 */}
      <div className="bg-action-danger/10 rounded-xl border border-action-danger/20 p-4 text-center">
        <p className="text-xs text-text-muted mb-2">상대가 버린 패</p>
        <div className="flex justify-center">
          <TileComponent tileId={kindToDisplayId(CALL_DISCARD_KIND)} size="md" highlighted />
        </div>
        <p className="text-xs text-text-secondary mt-1">{TILE_LABELS[CALL_DISCARD_KIND] || ''}</p>
      </div>

      {/* 내 손패 (11, 12 강조) */}
      <div className="bg-panel/60 rounded-xl border border-white/5 p-4">
        <h3 className="text-xs text-text-muted mb-3">내 손패</h3>
        <div className="flex gap-1 flex-wrap justify-center">
          {CALL_HAND_KINDS.map((kind, i) => (
            <TileComponent
              key={i}
              tileId={kindToDisplayId(kind)}
              size="sm"
              highlighted={!called && (kind === 11 || kind === 12)}
            />
          ))}
        </div>
        {!called && (
          <p className="text-[10px] text-action-chi text-center mt-3">{CALL_HINT}</p>
        )}
      </div>

      {/* 치 버튼 */}
      {!called ? (
        <button
          onClick={() => setCalled(true)}
          className="w-full py-3.5 rounded-xl text-base font-bold cursor-pointer
            bg-action-chi/20 text-action-chi border border-action-chi/40
            hover:bg-action-chi/30 transition-colors animate-pulse"
        >
          치! (吃)
        </button>
      ) : (
        <div className="bg-action-success/10 rounded-xl border border-action-success/20 p-4 text-center animate-fade-in">
          <h3 className="text-lg font-display font-bold text-action-success mb-2">치 성공!</h3>
          <div className="flex gap-0.5 justify-center mb-2">
            <TileComponent tileId={kindToDisplayId(11)} size="sm" />
            <TileComponent tileId={kindToDisplayId(12)} size="sm" />
            <div className="ring-2 ring-action-chi rounded-sm">
              <TileComponent tileId={kindToDisplayId(13)} size="sm" />
            </div>
          </div>
          <p className="text-xs text-text-muted mb-1">순자 완성! 가져온 패는 공개됩니다.</p>
          <p className="text-[10px] text-text-muted">
            같은 방법으로 펑(같은 패 3장)이나 깡(같은 패 4장)도 가능합니다.
          </p>
          <button
            onClick={onComplete}
            className="mt-3 px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer
              bg-gold/15 text-gold border border-gold/25 hover:bg-gold/25 transition-colors"
          >
            다음: 화료!
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Step 5: 화료 ───
function WinStep() {
  const router = useRouter();
  const [won, setWon] = useState(false);
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-panel rounded-xl border border-white/5 p-4">
        <p className="text-sm text-text-secondary mb-1">
          텐파이 상태에서 대기패가 오면 <span className="text-gold font-semibold">화료</span>를 선언합니다!
        </p>
        <p className="text-xs text-text-muted">직접 뽑으면 &quot;쯔모&quot;, 상대가 버린 걸 가져가면 &quot;론&quot;이에요.</p>
      </div>

      {/* 손패 */}
      <div className="bg-panel/60 rounded-xl border border-white/5 p-4">
        <h3 className="text-xs text-text-muted mb-3">내 손패 (텐파이!)</h3>
        <div className="flex gap-1 flex-wrap justify-center items-end">
          {WIN_HAND_KINDS.map((kind, i) => (
            <TileComponent key={i} tileId={kindToDisplayId(kind)} size="sm" />
          ))}
          {/* 쯔모패 */}
          {!won && (
            <div className="ml-2 ring-2 ring-gold rounded-sm animate-pulse">
              <TileComponent tileId={kindToDisplayId(WIN_TILE_KIND)} size="sm" highlighted />
            </div>
          )}
        </div>
        {!won && (
          <div className="text-center mt-2">
            <p className="text-[10px] text-gold">{WIN_HINT}</p>
            <p className="text-[10px] text-text-muted mt-1">
              대기패: {TILE_LABELS[WIN_TILE_KIND] || ''}을 뽑았습니다!
            </p>
          </div>
        )}
      </div>

      {/* 쯔모 버튼 */}
      {!won ? (
        <button
          onClick={() => setWon(true)}
          className="w-full py-4 rounded-xl text-lg font-bold cursor-pointer
            bg-gradient-to-r from-gold-dark via-gold to-gold-light text-text-on-gold
            hover:shadow-gold-glow transition-all animate-pulse"
        >
          쯔모! (自摸)
        </button>
      ) : (
        <div className="animate-fade-in">
          {/* 화료 결과 */}
          <div className="bg-gradient-to-b from-panel-light to-panel rounded-2xl border border-gold/20
            shadow-gold-glow p-5 text-center">
            <h2 className="text-3xl font-tile text-gold font-bold mb-3"
              style={{ textShadow: '0 0 20px rgba(212,168,75,0.5)' }}>
              화료! 和了
            </h2>
            <p className="text-xs text-text-muted mb-4">쯔모 (自摸) — 직접 뽑아서 이겼습니다!</p>

            {/* 완성된 패 */}
            <div className="flex gap-0.5 justify-center flex-wrap mb-4">
              {WIN_HAND_KINDS.map((kind, i) => (
                <TileComponent key={i} tileId={kindToDisplayId(kind)} size="sm" />
              ))}
              <div className="ml-2 ring-2 ring-gold rounded-sm">
                <TileComponent tileId={kindToDisplayId(WIN_TILE_KIND)} size="sm" />
              </div>
            </div>

            {/* 역 설명 */}
            <div className="space-y-1.5 mb-4 text-left">
              <div className="flex justify-between items-center px-3 py-1.5 rounded border bg-gold/10 border-gold/20">
                <div>
                  <span className="text-text-primary text-sm">평화</span>
                  <span className="text-text-muted text-xs ml-2">平和</span>
                </div>
                <span className="font-display font-bold text-gold">2점</span>
              </div>
              <div className="flex justify-between items-center px-3 py-1.5 rounded border bg-base/50 border-transparent">
                <div>
                  <span className="text-text-primary text-sm">자적</span>
                  <span className="text-text-muted text-xs ml-2">自摸</span>
                </div>
                <span className="font-display font-bold text-text-primary">1점</span>
              </div>
            </div>

            <div className="border-t border-gold/20 pt-3 mb-4">
              <span className="text-text-secondary text-sm mr-2">총점</span>
              <span className="font-display font-bold text-2xl text-gold"
                style={{ textShadow: '0 0 16px rgba(212,168,75,0.4)' }}>
                8점 이상
              </span>
            </div>

            <p className="text-xs text-text-muted mb-4">
              축하합니다! 이제 마작의 기본을 마스터했습니다.
              <br />실전에서는 더 많은 역과 전략이 있어요!
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/game?difficulty=easy&beginner=true')}
                className="px-6 py-3 rounded-xl font-bold text-sm cursor-pointer
                  bg-gradient-to-r from-gold-dark via-gold to-gold-light text-text-on-gold
                  hover:shadow-gold-glow transition-all"
              >
                게임 시작하기!
              </button>
              <button
                onClick={() => router.push('/rules')}
                className="px-5 py-3 rounded-xl font-semibold text-sm cursor-pointer
                  bg-panel-light text-text-secondary border border-white/5
                  hover:border-white/10 transition-colors"
              >
                규칙 더 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
