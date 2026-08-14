# SVARA

## Personalized Voice-Preserving Speech Correction System for Cleft Lip and Palate Speech

SVARA is a research-oriented speech processing system designed to improve the recognition and correction of speech affected by cleft lip and palate (CLP), while ultimately preserving the speaker's individual vocal characteristics.

The project combines automatic speech recognition, personalized fine-tuning, speech augmentation, and error analysis to investigate how machine learning can better handle speaker-specific pronunciation patterns.

---

## Project Overview

People with cleft lip and palate may experience speech characteristics that can make conventional Automatic Speech Recognition (ASR) systems less accurate.

General-purpose ASR models are trained primarily on typical speech and may struggle with speaker-specific pronunciation patterns.

SVARA explores a personalized ASR approach using OpenAI Whisper with Parameter-Efficient Fine-Tuning (PEFT) and Low-Rank Adaptation (LoRA).

The long-term goal is to develop a system capable of:

1. Recording a user's speech.
2. Recognizing the spoken content.
3. Identifying pronunciation-related errors.
4. Producing corrected speech/text.
5. Preserving the speaker's original vocal identity.

The current development stage focuses primarily on the personalized ASR component.

---

## Research Objective

The primary research objective is to investigate whether personalized fine-tuning of Whisper using LoRA can improve ASR performance on cleft speech.

The main evaluation metric is Word Error Rate (WER).

The current target is to reduce WER below the existing baseline of approximately 23.7%.

---

## Current Results

All experiments use the same held-out validation split to maintain a consistent comparison.

| Experiment | Configuration | Held-out WER | Status |
|---|---|---:|---|
| Baseline / Previous model | Initial fine-tuned model | 23.70% | Completed |
| V2 | LoRA r=16 + SpecAugment + early stopping | 23.69% | Completed |
| V3 | LoRA + stochastic/dynamic augmentation | In progress | Ongoing |

### V2 Evaluation

The latest properly evaluated V2 model achieved:

**23.69% WER on 54 held-out samples**

Validation observations:

- 54 held-out samples
- 49 samples with zero WER
- 5 samples containing recognition errors
- 49/54 = 90.74% of held-out samples were perfectly transcribed

The 23.69% result is effectively the same as the previous 23.7% result. Therefore, V2 is not considered a meaningful WER improvement.

---

## Experiments

### V1 — Initial LoRA Fine-Tuning

The first personalized Whisper experiment used LoRA fine-tuning to adapt Whisper-small to the collected speech data.

The experiment achieved approximately:

**23.7% held-out WER**

This established the initial project benchmark.

---

### V2 — LoRA + SpecAugment

The second experiment investigated whether increasing LoRA capacity and adding SpecAugment could improve generalization.

Key changes included:

- LoRA rank: `r=8 → r=16`
- SpecAugment
- Extended training configuration
- Early stopping
- Best-checkpoint loading
- Improved checkpoint retention

An earlier training run temporarily reached **19.79% validation WER around epoch 7**, but later epochs showed overfitting and validation performance deteriorated.

A subsequent properly evaluated V2 model achieved **23.69% WER** on the fixed 54-file held-out set.

This experiment demonstrated that simply increasing LoRA capacity and adding static augmentation did not provide a meaningful improvement.

---

### V3 — Stochastic Augmentation

V3 investigates whether the way augmentation is applied during training is responsible for the limited improvement observed in V2.

Instead of applying SpecAugment once during preprocessing, V3 applies augmentation dynamically during training so that different augmented representations can be generated across batches and epochs.

The experiment also investigates randomized speed and pitch augmentation.

The held-out validation set remains unchanged to prevent data leakage.

V3 is currently an ongoing experiment.

---

## Error Analysis

The current V2 held-out evaluation identified five imperfect samples among the 54 validation recordings.

Important observed errors include:

```text
achieves → accuse
snake → lake
